import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ generate: vi.fn(), classify: vi.fn(), extract: vi.fn(), ocrPages: vi.fn() }))
vi.mock("@google/genai", async importOriginal => ({ ...await importOriginal<typeof import("@google/genai")>(), GoogleGenAI: class { models = { generateContent: mocks.generate } } }))
vi.mock("@firecrawl/pdf-inspector", () => ({ classifyPdfAsync: mocks.classify, extractPagesMarkdownAsync: mocks.extract }))
vi.mock("./ocr", async importOriginal => ({ ...await importOriginal<typeof import("./ocr")>(), ocrPages: mocks.ocrPages }))
import { checkQaDocument } from "./transmittal-qa"
import type { QaRequest } from "../lib/transmittal-qa"

const request = (): QaRequest => ({
  document: { id: "doc", name: "Business permit.pdf", mimeType: "application/pdf", revision: "one" },
  content: Buffer.from("%PDF-1.4 scan").toString("base64"), isText: false,
  requirements: [{ id: "permit", name: "Business permit", mode: "exact", keywords: ["Acme corporation"] }],
})
const aiResult = { completeCoverage: true, findings: [{ requirementId: "permit", filename: "match", explanation: "ok", keywords: [{ keyword: "Acme corporation", status: "found", evidence: "Acme corporation", page: 2 }] }] }

// REQ-4 + REQ-8: OCR'd scans are checked from text but remain review-only.
describe("QA with selective OCR", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.classify.mockResolvedValue({ pageCount: 2, pagesNeedingOcr: [1] })
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown: "Cover document", needsOcr: false }, { page: 1, markdown: "", needsOcr: true }] })
    mocks.generate.mockResolvedValue({ text: JSON.stringify(aiResult), candidates: [{ finishReason: "STOP" }] })
  })

  it("OCRs only the flagged page and sends text instead of the PDF", async () => {
    mocks.ocrPages.mockResolvedValue({ pages: [{ page: 2, text: "ACME corporation permit", source: "Ocr", confidence: 0.9, hostedRecommended: false }], ocrMs: 9, routed: [2] })
    const result = await checkQaDocument(request(), "key", "model")
    expect(mocks.ocrPages.mock.calls[0][1]).toMatchObject({ pages: [2], maxPages: 10 })
    const parts = mocks.generate.mock.calls[0][0].contents.parts
    expect(parts[1].inlineData).toBeUndefined()
    expect(parts[1].text).toContain("[Page 2]")
    expect(result).toMatchObject({ coverage: "visual", contentSource: "ocr" })
    expect(result.findings[0].keywords[0]).toMatchObject({ status: "uncertain", page: 2 })
    expect(result.findings[0].keywords[0].evidence).toContain("acme corporation")
  })

  it("falls back to whole-PDF visual reading with the OCR reason", async () => {
    mocks.ocrPages.mockResolvedValue({ pages: [], reason: "ocr_timeout", ocrMs: 45_000, routed: [] })
    const result = await checkQaDocument(request(), "key", "model")
    expect(mocks.generate.mock.calls[0][0].contents.parts[1].inlineData.data).toBe(request().content)
    expect(result).toMatchObject({ coverage: "visual", contentSource: "gemini-visual", reason: "ocr_timeout" })
  })

  it("does not OCR when more pages are flagged than the cap", async () => {
    mocks.classify.mockResolvedValue({ pageCount: 12, pagesNeedingOcr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] })
    mocks.extract.mockResolvedValue({ pages: Array.from({ length: 12 }, (_, page) => ({ page, markdown: "", needsOcr: true })) })
    const result = await checkQaDocument(request(), "key", "model")
    expect(mocks.ocrPages).not.toHaveBeenCalled()
    expect(result).toMatchObject({ contentSource: "gemini-visual", reason: "scan_unreadable" })
  })
})
