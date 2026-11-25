import type { ParseReason, ReadMethod } from "@/lib/parse-reasons"
import { ocrPages, ocrParseMaxPages } from "./ocr"

export type PreparedPdf = {
  content: string
  mimeType: string
  isText: boolean
  extractedPdfText: boolean
  /** How the prepared content was obtained (spec REQ-2). */
  readMethod?: ReadMethod
  /** Why the content is not plain document text, when known. */
  reason?: ParseReason
  pageCount?: number
  /** Pages whose text came from local OCR. */
  ocrPages?: number
  ocrMs?: number
}

const MAX_TEXT = 32_000
const usable = (text: string) => text.length >= 80 && !text.includes("�")

/** Native extraction stays server-side and off the Node event loop. */
export async function preparePdfForParsing(
  content: string,
  mimeType: string,
  isText: boolean,
): Promise<PreparedPdf> {
  const original = { content, mimeType, isText, extractedPdfText: false }
  if (isText || mimeType !== "application/pdf") return isText ? { ...original, readMethod: "text" } : original

  const bytes = Buffer.from(content, "base64")
  let pageCount: number | undefined
  let flagged: number[] | undefined
  try {
    // Load lazily so missing native binaries don't break non-PDF requests.
    const inspector = await import("@firecrawl/pdf-inspector")
    try {
      // Classification is cheap (~10-50 ms) and decides whether OCR is ever considered.
      const classification = await inspector.classifyPdfAsync(bytes)
      pageCount = classification.pageCount
      flagged = classification.pagesNeedingOcr.map(page => page + 1)
    } catch {
      // Extraction below still decides; classification is advisory.
    }
    const result = await inspector.extractPagesMarkdownAsync(bytes, [0])
    const cover = result.pages.find(page => page.page === 0)
    const text = cover?.markdown.trim() || ""
    if (cover && !cover.needsOcr && usable(text)) {
      return { content: text.slice(0, MAX_TEXT), mimeType: "text/plain", isText: true, extractedPdfText: true, readMethod: "text", pageCount }
    }
  } catch {
    // Never log PDF contents; visual parsing remains available on native errors.
    console.warn("PDF Inspector extraction unavailable; using visual PDF parsing.")
    return { ...original, readMethod: "visual", reason: "extraction_failed", pageCount }
  }

  // The cover is scanned, sparse, or broken-font: OCR the cover plus bounded flagged pages.
  const cap = ocrParseMaxPages()
  const last = Math.min(cap, pageCount || 1)
  const pages = Array.from(new Set([1, ...(flagged || [])])).filter(page => page <= last)
  const outcome = await ocrPages(bytes, { pages, maxPages: cap })
  const ocrCount = outcome.pages.filter(page => page.source !== "Native").length
  const ocrText = outcome.pages.map(page => page.text.trim()).filter(Boolean).join("\n\n")
  if (!outcome.reason && usable(ocrText)) {
    return {
      content: ocrText.slice(0, MAX_TEXT), mimeType: "text/plain", isText: true, extractedPdfText: true,
      readMethod: ocrCount ? "ocr" : "text", pageCount, ocrPages: ocrCount, ocrMs: outcome.ocrMs,
    }
  }
  return {
    ...original, readMethod: "visual", reason: outcome.reason || "scan_unreadable",
    pageCount, ocrPages: ocrCount, ocrMs: outcome.ocrMs,
  }
}

/** Native text of pages 2-3, read once and only when the cover had no identifier (J3). */
export async function extractLaterPagesText(content: string): Promise<string> {
  try {
    const { extractPagesMarkdownAsync } = await import("@firecrawl/pdf-inspector")
    const result = await extractPagesMarkdownAsync(Buffer.from(content, "base64"), [1, 2])
    return result.pages
      .filter(page => !page.needsOcr && !page.markdown.includes("�"))
      .map(page => page.markdown)
      .join("\n")
      .slice(0, MAX_TEXT)
  } catch {
    return ""
  }
}
