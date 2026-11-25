import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ ocr: vi.fn(), imported: vi.fn() }))
vi.mock("@firecrawl/pdf-inspector", () => {
  mocks.imported()
  return { processPdfWithOcr: mocks.ocr }
})
import { __resetOcrForTests, ocrPages } from "./ocr"

const runtimeDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "ocr-runtime-"))
  mkdirSync(join(dir, "lib")); mkdirSync(join(dir, "models"))
  writeFileSync(join(dir, "lib/libpdfium.so"), "")
  writeFileSync(join(dir, "lib/libonnxruntime.so.1.27.0"), "")
  return dir
}
const page = (pageNumber: number, markdown: string, source = "Ocr") => ({
  pageNumber, markdown,
  provenance: { pageNumber, source, ocrConfidence: 0.91, hostedRecommended: false, warnings: [], timings: { renderMs: 1, ocrMs: 1, assemblyMs: 0 } },
})
const bytes = Buffer.from("%PDF-1.4 scanned")

// REQ-8: selective, bounded, cached, honest OCR.
describe("ocrPages", () => {
  beforeEach(() => {
    __resetOcrForTests()
    vi.stubEnv("OCR_ENABLED", "true")
    vi.stubEnv("OCR_RUNTIME_DIR", runtimeDir())
    vi.stubEnv("PDFIUM_LIB_PATH", ""); vi.stubEnv("ORT_DYLIB_PATH", "")
    mocks.ocr.mockImplementation(async (_buffer: Buffer, options: { pageNumbers: number[] }) => ({
      pages: options.pageNumbers.map(n => page(n, `Page ${n} text`)),
      pagesRoutedToOcr: options.pageNumbers, pagesRecommendingHosted: [], ocrTimeMs: 5,
    }))
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it("is unavailable without loading the native module when disabled", async () => {
    vi.stubEnv("OCR_ENABLED", "false")
    const result = await ocrPages(bytes, { pages: [1], maxPages: 3 })
    expect(result.reason).toBe("ocr_unavailable")
    expect(mocks.imported).not.toHaveBeenCalled()
    expect(mocks.ocr).not.toHaveBeenCalled()
  })

  it("is unavailable when runtime libraries are missing", async () => {
    vi.stubEnv("OCR_RUNTIME_DIR", mkdtempSync(join(tmpdir(), "ocr-empty-")))
    expect((await ocrPages(bytes, { pages: [1], maxPages: 3 })).reason).toBe("ocr_unavailable")
    expect(mocks.ocr).not.toHaveBeenCalled()
  })

  it("routes only the requested pages, capped, offline and in Auto mode", async () => {
    const result = await ocrPages(bytes, { pages: [5, 1, 1, 2, 9], maxPages: 2 })
    expect(mocks.ocr).toHaveBeenCalledTimes(1)
    expect(mocks.ocr.mock.calls[0][1]).toMatchObject({ mode: "Auto", pageNumbers: [1, 2], offline: true })
    expect(result.pages.map(p => p.page)).toEqual([1, 2])
    expect(result.pages[0]).toMatchObject({ text: "Page 1 text", source: "Ocr", confidence: 0.91 })
    expect(process.env.PDFIUM_LIB_PATH).toMatch(/libpdfium\.so$/)
  })

  it("reuses cached pages for identical bytes and shares in-flight work", async () => {
    await Promise.all([ocrPages(bytes, { pages: [1], maxPages: 3 }), ocrPages(bytes, { pages: [1], maxPages: 3 })])
    expect(mocks.ocr).toHaveBeenCalledTimes(1)
    await ocrPages(bytes, { pages: [1], maxPages: 3 })
    expect(mocks.ocr).toHaveBeenCalledTimes(1)
    await ocrPages(bytes, { pages: [1, 2], maxPages: 3 })
    expect(mocks.ocr).toHaveBeenCalledTimes(2)
    expect(mocks.ocr.mock.calls[1][1].pageNumbers).toEqual([2])
  })

  it("stops at the time budget with ocr_timeout", async () => {
    mocks.ocr.mockImplementation(() => new Promise(() => {}))
    const result = await ocrPages(bytes, { pages: [1], maxPages: 3, budgetMs: 20 })
    expect(result.reason).toBe("ocr_timeout")
    expect(result.pages).toEqual([])
  })

  it("degrades native errors to ocr_unavailable without logging text", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    mocks.ocr.mockRejectedValue(new Error("libonnxruntime.so: cannot open shared object file"))
    expect((await ocrPages(bytes, { pages: [1], maxPages: 3 })).reason).toBe("ocr_unavailable")
    expect(JSON.stringify(warn.mock.calls)).not.toContain("Page 1 text")
    warn.mockRestore()
  })
})
