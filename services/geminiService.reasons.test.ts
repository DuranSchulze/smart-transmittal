import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ generateContent: vi.fn(), createClient: vi.fn() }))
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) { mocks.createClient(options) }
    models = { generateContent: mocks.generateContent }
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", ARRAY: "ARRAY" },
}))
import { buildFailureParseResult, parseTransmittalDocument, resolveDocumentNumberWithFallback } from "./geminiService"

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

// H1 + H6 / REQ-1: provider failures carry one reason and safe copy, never raw text.
describe("Gemini failure reasons", () => {
  const visual = () => parseTransmittalDocument("JVBERg==", "application/pdf", false, "scan.pdf", "key")

  it.each([
    [Object.assign(new Error("Request timed out after 60000ms"), {}), "provider_timeout"],
    [Object.assign(new Error("got status: 429 quota exceeded"), { status: 429 }), "provider_limit"],
    [Object.assign(new Error("Request payload size exceeds the limit: 20971520 bytes"), { status: 400 }), "provider_limit"],
    [Object.assign(new Error("models/nope is not found"), { status: 404 }), "invalid_model"],
    [Object.assign(new Error("API key not valid"), { status: 400 }), "provider_rejected"],
    [Object.assign(new Error("Internal error"), { status: 500 }), "provider_rejected"],
  ])("maps %s", async (error, reason) => {
    mocks.generateContent.mockRejectedValue(error)
    const result = await visual()
    expect(result).toMatchObject({ parser: "fallback", reason, readMethod: "none" })
    expect(result.error).not.toContain((error as Error).message)
    expect(result.items[0].remarks).not.toContain((error as Error).message)
  })

  it("classifies malformed JSON and unfinished output as invalid_output", async () => {
    mocks.generateContent.mockResolvedValue({ text: "not json at all" })
    expect((await visual()).reason).toBe("invalid_output")
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items: [] }) })
    expect((await visual()).reason).toBe("invalid_output")
  })

  it("reports a missing key as config_missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("GOOGLE_API_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_GEMINI_API_KEY", ""); vi.stubEnv("NEXT_PUBLIC_GOOGLE_API_KEY", "")
    expect((await parseTransmittalDocument("JVBERg==", "application/pdf", false, "scan.pdf")).reason).toBe("config_missing")
  })

  it("marks a successful visual read as visual, not text", async () => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items: [{ description: "Deed of Sale", documentNumber: "TD-2024-001", qty: "1", remarks: "" }] }) })
    expect((await visual()).readMethod).toBe("visual")
  })

  it("honours a shorter provider timeout when the route has already spent time", async () => {
    mocks.generateContent.mockResolvedValue({ text: JSON.stringify({ items: [{ description: "Deed of Sale", documentNumber: "TD-2024-001", qty: "1", remarks: "" }] }) })
    await parseTransmittalDocument("JVBERg==", "application/pdf", false, "scan.pdf", "key", false, undefined, { timeoutMs: 25_000 })
    expect(mocks.createClient).toHaveBeenCalledWith(expect.objectContaining({ httpOptions: { timeout: 25_000 } }))
  })
})

// Q4 default (D8): unreadable rows with generic names get no invented number.
describe("unreadable document numbers", () => {
  it.each(["scan.pdf", "Scan 001.pdf", "document.pdf", "IMG_20241105.pdf", "untitled.pdf", "file (2).pdf"])("leaves %s blank", name => {
    expect(resolveDocumentNumberWithFallback({ sourceName: name, description: name, documentType: "File", unreadable: true })).toBe("")
  })
  it("keeps meaningful names", () => {
    expect(resolveDocumentNumberWithFallback({ sourceName: "INV-55821 Acme.pdf", description: "INV-55821 Acme", documentType: "File", unreadable: true })).not.toBe("")
  })
  it("builds a failure row from a reason", () => {
    const result = buildFailureParseResult("scan.pdf", "too_large")
    expect(result).toMatchObject({ parser: "fallback", reason: "too_large", readMethod: "none", fallbackCount: 1 })
    expect(result.items[0].documentNumber).toBe("")
  })
})
