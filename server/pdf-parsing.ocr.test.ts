import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ extract: vi.fn(), classify: vi.fn(), ocrPages: vi.fn() }))
vi.mock("@firecrawl/pdf-inspector", () => ({ extractPagesMarkdownAsync: mocks.extract, classifyPdfAsync: mocks.classify }))
vi.mock("./ocr", async importOriginal => ({ ...await importOriginal<typeof import("./ocr")>(), ocrPages: mocks.ocrPages }))
import { extractLaterPagesText, preparePdfForParsing } from "./pdf-parsing"

const content = Buffer.from("%PDF-1.4 test").toString("base64")
const goodText = "Invoice No INV-12345\nRecipient: Acme Corporation\nProject: Office Renovation\nOriginal document"

// H1 / REQ-2 / REQ-8: scans are classified, OCR'd selectively, and labelled.
describe("PDF preparation with selective OCR", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.classify.mockResolvedValue({ pdfType: "Scanned", pageCount: 6, pagesNeedingOcr: [0, 1, 2, 3, 4, 5], confidence: 0.9 })
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown: "", needsOcr: true }] })
  })

  it("never calls OCR for a text PDF", async () => {
    mocks.classify.mockResolvedValue({ pdfType: "TextBased", pageCount: 1, pagesNeedingOcr: [], confidence: 1 })
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown: goodText, needsOcr: false }] })
    const prepared = await preparePdfForParsing(content, "application/pdf", false)
    expect(prepared).toMatchObject({ isText: true, readMethod: "text", pageCount: 1 })
    expect(mocks.ocrPages).not.toHaveBeenCalled()
  })

  it("OCRs only flagged pages within the parse cap and sends text", async () => {
    mocks.ocrPages.mockResolvedValue({ pages: [{ page: 1, text: goodText, source: "Ocr", confidence: 0.9, hostedRecommended: false }], ocrMs: 12, routed: [1] })
    const prepared = await preparePdfForParsing(content, "application/pdf", false)
    expect(mocks.ocrPages.mock.calls[0][1]).toMatchObject({ pages: [1, 2, 3], maxPages: 3 })
    expect(prepared).toMatchObject({ isText: true, extractedPdfText: true, readMethod: "ocr", content: goodText, ocrPages: 1 })
  })

  it("keeps the visual path with ocr_unavailable when OCR cannot run", async () => {
    mocks.ocrPages.mockResolvedValue({ pages: [], reason: "ocr_unavailable", ocrMs: 0, routed: [] })
    expect(await preparePdfForParsing(content, "application/pdf", false)).toMatchObject({
      content, mimeType: "application/pdf", isText: false, readMethod: "visual", reason: "ocr_unavailable", pageCount: 6,
    })
  })

  it("reports scan_unreadable when OCR finds no usable text", async () => {
    mocks.ocrPages.mockResolvedValue({ pages: [{ page: 1, text: "  ", source: "Ocr", confidence: 0.1, hostedRecommended: true }], ocrMs: 4, routed: [1] })
    expect(await preparePdfForParsing(content, "application/pdf", false)).toMatchObject({ readMethod: "visual", reason: "scan_unreadable" })
  })

  it("reports extraction_failed on native errors", async () => {
    mocks.classify.mockRejectedValue(new Error("Invalid PDF"))
    mocks.extract.mockRejectedValue(new Error("Invalid PDF"))
    expect(await preparePdfForParsing(content, "application/pdf", false)).toMatchObject({ readMethod: "visual", reason: "extraction_failed" })
  })
})

// H5 / J3: later pages are read once, only on demand.
describe("extractLaterPagesText", () => {
  it("reads pages 2-3 natively", async () => {
    mocks.extract.mockResolvedValue({ pages: [{ page: 1, markdown: "Control No: CN-2024-0099", needsOcr: false }, { page: 2, markdown: "Annex", needsOcr: false }] })
    expect(await extractLaterPagesText(content)).toContain("CN-2024-0099")
    expect(mocks.extract).toHaveBeenCalledWith(Buffer.from(content, "base64"), [1, 2])
  })
  it("returns empty text on native errors", async () => {
    mocks.extract.mockRejectedValue(new Error("boom"))
    expect(await extractLaterPagesText(content)).toBe("")
  })
})
