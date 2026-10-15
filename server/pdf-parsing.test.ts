import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ extract: vi.fn() }))
vi.mock("@firecrawl/pdf-inspector", () => ({ extractPagesMarkdownAsync: mocks.extract }))
import { preparePdfForParsing } from "./pdf-parsing"

describe("PDF Inspector routing", () => {
  beforeEach(() => vi.clearAllMocks())
  const content = Buffer.from("%PDF-1.4 test").toString("base64")
  it("sends reliable cover text rather than the PDF binary", async () => {
    const markdown = "Invoice No INV-12345\nRecipient: Acme Corporation\nProject: Office Renovation\nOriginal document"
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown, needsOcr: false }] })
    expect(await preparePdfForParsing(content, "application/pdf", false)).toEqual({
      content: markdown, mimeType: "text/plain", isText: true, extractedPdfText: true,
    })
    expect(mocks.extract).toHaveBeenCalledWith(Buffer.from(content, "base64"), [0])
  })
  it.each([
    { markdown: "A".repeat(100), needsOcr: true },
    { markdown: "short", needsOcr: false },
    { markdown: "\uFFFD".repeat(100), needsOcr: false },
  ])("keeps visual parsing for unreliable cover text: %j", async page => {
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, ...page }] })
    expect(await preparePdfForParsing(content, "application/pdf", false)).toEqual({
      content, mimeType: "application/pdf", isText: false, extractedPdfText: false,
    })
  })
  it("falls back on native extraction errors", async () => {
    mocks.extract.mockRejectedValue(new Error("Invalid PDF"))
    expect((await preparePdfForParsing(content, "application/pdf", false)).extractedPdfText).toBe(false)
  })
  it("leaves images and existing text untouched", async () => {
    await preparePdfForParsing(content, "image/png", false)
    await preparePdfForParsing("text", "text/plain", true)
    expect(mocks.extract).not.toHaveBeenCalled()
  })
})
