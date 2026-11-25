import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), parse: vi.fn(), resolveKey: vi.fn(), model: vi.fn(), preparePdf: vi.fn(), later: vi.fn(),
}))
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }))
vi.mock("@/server/pdf-parsing", () => ({ preparePdfForParsing: mocks.preparePdf, extractLaterPagesText: mocks.later }))
vi.mock("@/server/user-ai-settings", () => ({ resolveUserGeminiKey: mocks.resolveKey, getUserGeminiModel: mocks.model }))
vi.mock("@/services/geminiService", async importOriginal => ({
  ...await importOriginal<typeof import("@/services/geminiService")>(),
  parseTransmittalDocument: mocks.parse,
}))
import { POST } from "./route"

const post = (body: Record<string, unknown>) => POST(new Request("http://localhost/api/parse-transmittal", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}))
const pdf = { mimeType: "application/pdf", isText: false, fileName: "scan.pdf" }

// REQ-1, REQ-5, REQ-6, J3, D7: the route returns and logs safe, typed diagnostics.
describe("parse route diagnostics", () => {
  let info: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("GEMINI_API_KEY", "system-key")
    info = vi.spyOn(console, "info").mockImplementation(() => {})
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.model.mockResolvedValue(null)
    mocks.resolveKey.mockResolvedValue({ apiKey: null, personalKeyStatus: "none" })
    mocks.later.mockResolvedValue("")
    mocks.preparePdf.mockImplementation(async (content: string, mimeType: string) => ({
      content, mimeType, isText: false, extractedPdfText: false, readMethod: "visual", reason: "ocr_unavailable", pageCount: 1,
    }))
    mocks.parse.mockResolvedValue({ parser: "gemini-visual", readMethod: "visual", items: [{ description: "Deed", documentNumber: "TD-1", qty: "1", remarks: "" }] })
  })
  afterEach(() => { vi.unstubAllEnvs(); info.mockRestore() })

  it("returns readMethod, reason and keyClass, and logs the flow without content or names", async () => {
    const response = await post({ ...pdf, content: "JVBERg==", flow: "drive-folder" })
    expect(await response.json()).toMatchObject({ readMethod: "visual", reason: "ocr_unavailable", keyClass: "system" })
    const line = JSON.parse(info.mock.calls.find(call => String(call[0]).includes("document_parse_complete"))![0] as string)
    expect(line).toMatchObject({ flow: "drive-folder", reason: "ocr_unavailable", readMethod: "visual", keyClass: "system" })
    expect(JSON.stringify(line)).not.toContain("scan.pdf")
    expect(JSON.stringify(line)).not.toContain("JVBERg==")
  })

  it("ignores an unknown flow value instead of failing validation", async () => {
    expect((await post({ ...pdf, content: "JVBERg==", flow: "<script>" })).status).toBe(200)
  })

  it("reports the system key when the personal key is unusable", async () => {
    mocks.resolveKey.mockResolvedValue({ apiKey: null, personalKeyStatus: "unusable" })
    expect(await (await post({ ...pdf, content: "JVBERg==" })).json()).toMatchObject({ keyClass: "system", personalKeyStatus: "unusable" })
  })

  it("refuses an oversized visual PDF before calling Gemini", async () => {
    vi.stubEnv("GEMINI_INLINE_MAX_BYTES", "10")
    const body = await (await post({ ...pdf, content: Buffer.alloc(64).toString("base64") })).json()
    expect(body).toMatchObject({ parser: "fallback", reason: "too_large", readMethod: "none" })
    expect(mocks.parse).not.toHaveBeenCalled()
  })

  it("returns too_large for requests over the encoded cap", async () => {
    const response = await post({ ...pdf, content: "a".repeat(25 * 1024 * 1024 + 1) })
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ reason: "too_large" })
  })

  it("finds an identifier on page 2 when the cover had none (J3)", async () => {
    mocks.preparePdf.mockResolvedValue({ content: "Cover letter text", mimeType: "text/plain", isText: true, extractedPdfText: true, readMethod: "text", pageCount: 3 })
    mocks.parse.mockResolvedValue({ parser: "gemini-text", readMethod: "text", fallbackCount: 1, items: [{ description: "Deed of Sale", documentNumber: "DOC-PENDING", qty: "1", remarks: "" }] })
    mocks.later.mockResolvedValue("Annex\nControl No: CN-2024-0099\n")
    const body = await (await post({ ...pdf, content: "JVBERg==" })).json()
    expect(body.items[0].documentNumber).toBe("CN-2024-0099")
    expect(body.reason).toBeUndefined()
  })

  it("reports document_number_unresolved when later pages have no identifier (J3)", async () => {
    mocks.preparePdf.mockResolvedValue({ content: "Cover letter text", mimeType: "text/plain", isText: true, extractedPdfText: true, readMethod: "text", pageCount: 3 })
    mocks.parse.mockResolvedValue({ parser: "gemini-text", readMethod: "text", fallbackCount: 1, items: [{ description: "Deed of Sale", documentNumber: "DOC-PENDING", qty: "1", remarks: "" }] })
    expect((await (await post({ ...pdf, content: "JVBERg==" })).json()).reason).toBe("document_number_unresolved")
  })

  it("gives Gemini a reduced timeout budget", async () => {
    await post({ ...pdf, content: "JVBERg==" })
    const options = mocks.parse.mock.calls[0][7]
    expect(options.timeoutMs).toBeGreaterThanOrEqual(20_000)
    expect(options.timeoutMs).toBeLessThanOrEqual(60_000)
  })
})
