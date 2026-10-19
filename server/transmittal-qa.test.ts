import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ generate: vi.fn(), classify: vi.fn(), extract: vi.fn() }))
vi.mock("@google/genai", async importOriginal => ({ ...await importOriginal<typeof import("@google/genai")>(), GoogleGenAI: class { models = { generateContent: mocks.generate } } }))
vi.mock("@firecrawl/pdf-inspector", () => ({ classifyPdfAsync: mocks.classify, extractPagesMarkdownAsync: mocks.extract }))
import { checkQaDocument, prepareQaDocument, exactQaKeyword } from "./transmittal-qa"
import type { QaRequest } from "../lib/transmittal-qa"

const request = (): QaRequest => ({
  document: { id: "doc", name: "Business permit.pdf", mimeType: "application/pdf", revision: "one" },
  content: Buffer.from("%PDF-1.4 test").toString("base64"), isText: false,
  requirements: [{ id: "permit", name: "Business permit", mode: "exact", keywords: ["Acme corporation"] }],
})
const response = () => ({ completeCoverage: true, findings: [{ requirementId: "permit", filename: "match", explanation: "Permit filename", keywords: [{ keyword: "Acme corporation", status: "missing", evidence: "", page: null }] }] })
const ai = (result = response(), finishReason = "STOP") => mocks.generate.mockResolvedValue({ text: JSON.stringify(result), candidates: [{ finishReason }] })
describe("full-document QA", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.classify.mockResolvedValue({ pageCount: 2 })
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown: "Cover document", needsOcr: false }, { page: 1, markdown: "ACME\n  corporation permit", needsOcr: false }] })
    ai()
  })
  it("extracts all pages and deterministically finds phrases on later pages", async () => {
    const result = await checkQaDocument(request(), "key", "model")
    expect(mocks.extract).toHaveBeenCalledWith(Buffer.from(request().content, "base64"))
    expect(result.coverage).toBe("full-text")
    expect(result.findings[0].keywords[0]).toMatchObject({ status: "found", page: 2 })
    expect(mocks.generate.mock.calls[0][0].contents.parts[1].text).toContain("[Page 2]")
  })
  it("checks case and whitespace without accepting synonyms in exact mode", () => {
    expect(exactQaKeyword("acme corporation", [{ text: "Acme\n CORPORATION", page: 2 }]).status).toBe("found")
    expect(exactQaKeyword("business permit", [{ text: "business license", page: 1 }]).status).toBe("missing")
  })
  it("sends the entire original PDF visually if extraction is scanned or incomplete", async () => {
    mocks.extract.mockResolvedValue({ pages: [{ page: 0, markdown: "Cover only", needsOcr: false }] })
    const result = await checkQaDocument(request(), "key", "model")
    expect(result.coverage).toBe("visual")
    expect(result.findings[0].keywords[0].status).toBe("uncertain")
    expect(mocks.generate.mock.calls[0][0].contents.parts[1].inlineData.data).toBe(request().content)
  })
  it("validates semantic evidence and page attribution against original text", async () => {
    const input = request(); input.requirements[0].mode = "semantic"
    const output = response(); output.findings[0].keywords[0] = { keyword: "Acme corporation", status: "found", evidence: "fabricated evidence", page: 2 }
    ai(output)
    expect((await checkQaDocument(input, "key", "model")).findings[0].keywords[0].status).toBe("uncertain")
    output.findings[0].keywords[0].evidence = "ACME corporation"
    ai(output)
    expect((await checkQaDocument(input, "key", "model")).findings[0].keywords[0]).toMatchObject({ status: "found", page: 2 })
  })
  it("rejects missing findings, keywords, malformed and truncated output", async () => {
    ai({ completeCoverage: true, findings: [] })
    await expect(checkQaDocument(request(), "key", "model")).rejects.toThrow("every requirement")
    const output = response(); output.findings[0].keywords = []; ai(output)
    await expect(checkQaDocument(request(), "key", "model")).rejects.toThrow("keyword checklist")
    ai(response(), "MAX_TOKENS")
    await expect(checkQaDocument(request(), "key", "model")).rejects.toThrow("incomplete or invalid")
    mocks.generate.mockResolvedValue({ text: "broken" })
    await expect(checkQaDocument(request(), "key", "model")).rejects.toThrow()
  })
  it("never calls AI with silently truncated full-text content", async () => {
    const input = request(); input.isText = true; input.document.mimeType = "text/plain"; input.content = "a".repeat(500_001)
    await expect(checkQaDocument(input, "key", "model")).rejects.toThrow("too long")
    expect(mocks.generate).not.toHaveBeenCalled()
    await expect(prepareQaDocument({ ...request(), document: { ...request().document, mimeType: "image/png" } })).rejects.toThrow("PDF and Word")
  })
})

it("marks partial Word extraction incomplete even when AI claims full coverage", async () => {
  const input = request()
  input.isText = true; input.document.mimeType = "text/plain"; input.content = "Acme Corporation"; input.textComplete = false
  ai()
  const result = await checkQaDocument(input, "key", "model")
  expect(result.coverage).toBe("incomplete")
  expect(result.error).toContain("Reattach a PDF")
})
