import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ generateContent: vi.fn(), createClient: vi.fn() }))
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) { mocks.createClient(options) }
    models = { generateContent: mocks.generateContent }
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY" },
}))
import { parseTransmittalDocument } from "./geminiService"

describe("Gemini parsing configuration", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
  it("bounds upstream requests and disables thinking for default Flash extraction", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash")
    vi.stubEnv("GEMINI_THINKING_BUDGET", "0")
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items: [{ description: 'Office Renovation Invoice', documentNumber: 'INV-12345', qty: '1', remarks: '' }] }) })
    await parseTransmittalDocument("text", "text/plain", true, "file.txt", "test-key")
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({
      httpOptions: { timeout: 60_000 },
    }))
    expect(mocks.generateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ thinkingConfig: { thinkingBudget: 0 } }),
    }))
  })
  it("does not send incompatible thinking settings to other models", async () => {
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-pro")
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items: [{ description: 'Office Renovation Invoice', documentNumber: 'INV-12345', qty: '1', remarks: '' }] }) })
    await parseTransmittalDocument("text", "text/plain", true, "file.txt", "test-key")
    expect(mocks.generateContent.mock.calls[0][0].config).not.toHaveProperty("thinkingConfig")
  })
  it("keeps one fallback item for extracted PDF text when Gemini fails", async () => {
    mocks.generateContent.mockRejectedValue(new Error("AI unavailable"))
    const result = await parseTransmittalDocument(
      "Invoice No INV-12345\nRecipient: Acme\nProject: Office\nOriginal", "text/plain", true, "invoice.pdf", "test-key", true,
    )
    expect(result.items).toHaveLength(1)
    expect(result.error).toBe("AI unavailable")
  })
  it("normalizes optional fields and keeps one item for a document", async () => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({
      items: [
        { description: "Office Invoice", documentNumber: "INV-12345", qty: null, remarks: null },
        { description: "Referenced attachment", documentNumber: "REF-99999" },
      ],
      extractedHeader: { projectName: " Office ", recipientEmail: 123, unexpected: "ignored" },
    }) })
    const result = await parseTransmittalDocument("text", "text/plain", true, "invoice.pdf", "test-key", true)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ qty: "1", remarks: "", documentNumber: "INV-12345" })
    expect(result.header).toEqual({ projectName: "Office" })
    expect(result.parser).toBe("gemini-text")
  })
  it.each([[], [{ description: null }]])("rejects unusable AI items instead of reporting successful extraction", async items => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items }) })
    const result = await parseTransmittalDocument("text", "text/plain", true, "invoice.pdf", "test-key", true)
    expect(result.parser).toBe("fallback")
    expect(result.error).toBeTruthy()
    expect(result.items).toHaveLength(1)
  })
})
