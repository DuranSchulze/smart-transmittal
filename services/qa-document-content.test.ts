import { describe, expect, it, vi } from "vitest"
// Exercise Mammoth's browser entry, as bundled by Next for the upload UI.
vi.mock("mammoth", async () => {
  const browser = await import("mammoth/mammoth.browser.js")
  return { extractRawText: browser.default.extractRawText }
})
import { Document, Header, Packer, Paragraph } from "docx"
import { extractQaWord, prepareQaContent } from "./qa-document-content"
const asArrayBuffer = (bytes: Buffer): ArrayBuffer => Uint8Array.from(bytes).buffer

describe("Word QA coverage", () => {
  it("extracts the full textual body of a simple Word document", async () => {
    const bytes = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Business permit"), new Paragraph("Acme Corporation 2026")] }] }))
    const result = await extractQaWord(asArrayBuffer(bytes))
    expect(result.content).toContain("Acme Corporation 2026")
    expect(result.textComplete).toBe(true)
    expect(result.isText).toBe(true)
  })
  it("does not approve Word files whose headers or visual content are omitted", async () => {
    const bytes = await Packer.toBuffer(new Document({ sections: [{ headers: { default: new Header({ children: [new Paragraph("Important header")] }) }, children: [new Paragraph("Body text")] }] }))
    const result = await prepareQaContent(bytes.toString("base64"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Permit.docx")
    expect(result.content).toContain("Body text")
    expect(result.textComplete).toBe(false)
  })
  it("rejects unsupported or unreadable files without returning invented text", async () => {
    await expect(prepareQaContent("raw", "image/png", "scan.png")).rejects.toThrow("PDF or Word")
    await expect(prepareQaContent("raw", "application/zip", "archive.zip")).rejects.toThrow("PDF and Word")
  })
})
