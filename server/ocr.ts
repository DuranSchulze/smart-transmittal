import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { join } from "node:path"
import type { OcrMode, OcrOptions, OcrPdfResult } from "@firecrawl/pdf-inspector"

/**
 * Selective local OCR (spec REQ-8, workflow Step 8).
 *
 * - Off unless OCR_ENABLED=true and the PDFium / ONNX Runtime / model runtime is present.
 * - Only the requested 1-indexed pages run, capped by `maxPages`; `Auto` mode skips
 *   pages whose native text is already reliable.
 * - The native API has no timeout or cancellation, so the budget bounds the response
 *   while the page cap bounds the work. A late native result still fills the cache.
 * - Results are cached per content hash and per page, and concurrent requests for the
 *   same pages share one native call. Page text is never logged.
 */

export type OcrSource = "Native" | "Ocr" | "Fused"
export type OcrPage = { page: number; text: string; source: OcrSource; confidence: number | null; hostedRecommended: boolean }
export type OcrOutcome = { pages: OcrPage[]; reason?: "ocr_timeout" | "ocr_unavailable"; ocrMs: number; routed: number[] }
export type OcrRequest = { pages: number[]; maxPages: number; budgetMs?: number }

const CACHE_ENTRIES = 32
const CACHE_TEXT_BYTES = 64 * 1024 * 1024
const CACHE_TTL_MS = 30 * 60 * 1000
const DEFAULT_BUDGET_MS = 45_000

type CacheEntry = { pages: Map<number, OcrPage>; at: number; size: number }
const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<OcrPage[]>>()
let cachedTextBytes = 0

export const ocrBudgetMs = () => positiveInt(process.env.OCR_TIME_BUDGET_MS, DEFAULT_BUDGET_MS)
export const ocrParseMaxPages = () => positiveInt(process.env.OCR_PARSE_MAX_PAGES, 3)
export const ocrQaMaxPages = () => positiveInt(process.env.OCR_QA_MAX_PAGES, 10)

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

type Runtime = { modelDirectory?: string }

/** Resolves the bundled runtime, or null when OCR must not run. */
function resolveRuntime(): Runtime | null {
  if (process.env.OCR_ENABLED !== "true") return null
  const root = process.env.OCR_RUNTIME_DIR || join(process.cwd(), "vendor", "ocr")
  const first = (names: string[]) => names.map(name => join(root, "lib", name)).find(path => existsSync(path))
  const pdfium = process.env.PDFIUM_LIB_PATH || first(["libpdfium.so", "libpdfium.dylib"])
  const ort = process.env.ORT_DYLIB_PATH || first(["libonnxruntime.so.1.27.0", "libonnxruntime.1.27.0.dylib"])
  if (!pdfium || !ort || !existsSync(pdfium) || !existsSync(ort)) return null
  const models = join(root, "models")
  const modelCache = join(root, "cache")
  // offline: true requires either a model directory or a warm managed cache.
  if (!existsSync(models) && !existsSync(modelCache)) return null
  // The native module reads these when it first routes a page.
  process.env.PDFIUM_LIB_PATH = pdfium
  process.env.ORT_DYLIB_PATH = ort
  if (existsSync(models)) return { modelDirectory: models }
  process.env.PDF_INSPECTOR_MODEL_CACHE ||= modelCache
  return {}
}

function cacheGet(hash: string) {
  const entry = cache.get(hash)
  if (!entry) return undefined
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(hash); cachedTextBytes -= entry.size
    return undefined
  }
  cache.delete(hash); cache.set(hash, entry) // refresh LRU position
  return entry
}

function cachePut(hash: string, pages: OcrPage[]) {
  const entry = cacheGet(hash) || { pages: new Map<number, OcrPage>(), at: Date.now(), size: 0 }
  const before = cache.has(hash) ? entry.size : 0
  for (const page of pages) {
    const previous = entry.pages.get(page.page)
    if (previous) entry.size -= previous.text.length
    entry.pages.set(page.page, page)
    entry.size += page.text.length
  }
  cache.delete(hash); cache.set(hash, entry)
  cachedTextBytes += entry.size - before
  while (cache.size > CACHE_ENTRIES || cachedTextBytes > CACHE_TEXT_BYTES) {
    const oldest = cache.keys().next().value
    if (oldest === undefined || oldest === hash) break
    cachedTextBytes -= cache.get(oldest)!.size
    cache.delete(oldest)
  }
}

function toPages(result: OcrPdfResult): OcrPage[] {
  return result.pages.map(page => ({
    page: page.pageNumber,
    text: page.markdown || "",
    source: String(page.provenance?.source || "Native") as OcrSource,
    confidence: typeof page.provenance?.ocrConfidence === "number" ? page.provenance.ocrConfidence : null,
    hostedRecommended: Boolean(page.provenance?.hostedRecommended),
  }))
}

async function runNative(bytes: Buffer, hash: string, pageNumbers: number[], runtime: Runtime) {
  // Lazy: the native OCR path is never touched unless a page is routed.
  const { processPdfWithOcr } = await import("@firecrawl/pdf-inspector")
  const options: OcrOptions = {
    // Ambient const enum + isolatedModules: pass the string value.
    mode: "Auto" as OcrMode,
    pageNumbers,
    offline: true,
    ...(runtime.modelDirectory ? { modelDirectory: runtime.modelDirectory } : {}),
  }
  const result = await processPdfWithOcr(bytes, options)
  const pages = toPages(result)
  cachePut(hash, pages)
  console.info(JSON.stringify({
    event: "ocr_complete",
    requestedPages: pageNumbers.length,
    routedPages: result.pagesRoutedToOcr?.length ?? 0,
    hostedRecommended: result.pagesRecommendingHosted?.length ?? 0,
    ocrMs: Math.round(result.ocrTimeMs ?? 0),
  }))
  return pages
}

export async function ocrPages(bytes: Buffer, request: OcrRequest): Promise<OcrOutcome> {
  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)
  const runtime = resolveRuntime()
  if (!runtime) return { pages: [], reason: "ocr_unavailable", ocrMs: 0, routed: [] }

  const wanted = Array.from(new Set(request.pages.filter(page => Number.isInteger(page) && page >= 1)))
    .sort((a, b) => a - b)
    .slice(0, Math.max(0, request.maxPages))
  if (!wanted.length) return { pages: [], ocrMs: 0, routed: [] }

  const hash = createHash("sha256").update(bytes).digest("hex")
  const collect = () => {
    const entry = cacheGet(hash)
    return wanted.flatMap(page => entry?.pages.get(page) ? [entry.pages.get(page)!] : [])
  }
  const missing = wanted.filter(page => !cacheGet(hash)?.pages.has(page))
  if (!missing.length) return { pages: collect(), ocrMs: 0, routed: [] }

  const key = `${hash}:${missing.join(",")}`
  let work = inflight.get(key)
  if (!work) {
    work = runNative(bytes, hash, missing, runtime).finally(() => inflight.delete(key))
    inflight.set(key, work)
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const budget = new Promise<"timeout">(resolve => { timer = setTimeout(() => resolve("timeout"), request.budgetMs ?? ocrBudgetMs()) })
  try {
    const outcome = await Promise.race([work, budget])
    if (outcome === "timeout") {
      // Let the native call finish in the background so a retry hits the cache.
      work.catch(() => {})
      return { pages: [], reason: "ocr_timeout", ocrMs: elapsed(), routed: [] }
    }
    return { pages: collect(), ocrMs: elapsed(), routed: missing }
  } catch (error) {
    // Missing shared libraries, absent models in offline mode, or a native failure.
    console.warn(JSON.stringify({ event: "ocr_unavailable", error: error instanceof Error ? error.name : "unknown" }))
    return { pages: [], reason: "ocr_unavailable", ocrMs: elapsed(), routed: [] }
  } finally {
    clearTimeout(timer)
  }
}

export function __resetOcrForTests() {
  cache.clear(); inflight.clear(); cachedTextBytes = 0
}
