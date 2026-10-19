import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ session: vi.fn(), check: vi.fn() }))
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } } }))
vi.mock("@/server/transmittal-qa", () => ({ checkQaDocument: mocks.check }))
vi.mock("@/server/user-ai-settings", () => ({ getDecryptedUserGeminiApiKey: async () => "private-key", getUserGeminiModel: async () => "chosen-model", getSystemDefaultGeminiModel: () => "system-model" }))
vi.mock("@/services/geminiService", () => ({ getSystemGeminiApiKey: () => "system-key" }))
vi.mock("@/server/observability", () => ({ withRouteMetrics: (_path: string, handler: unknown) => handler }))
import { POST } from "./route"
const input = { document: { id: "doc", name: "Permit.pdf", mimeType: "application/pdf", revision: "one" }, content: "pdf", isText: false, requirements: [{ id: "req", name: "Permit", keywords: [], mode: "exact" }] }
const request = (body: unknown = input) => new Request("http://localhost/api/transmittal-qa", { method: "POST", body: JSON.stringify(body) })
describe("QA endpoint", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { id: "owner" } }); mocks.check.mockResolvedValue({ ok: true }) })
  it("requires authentication before inspecting document content", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.check).not.toHaveBeenCalled()
  })
  it("rejects empty/duplicate requirements and excessive encoded content", async () => {
    expect((await POST(request({ ...input, requirements: [] }))).status).toBe(400)
    expect((await POST(request({ ...input, requirements: [input.requirements[0], input.requirements[0]] }))).status).toBe(400)
    const large = new Request("http://localhost/api/transmittal-qa", { method: "POST", body: "{}", headers: { "content-length": "99999999" } })
    expect((await POST(large)).status).toBe(413)
    expect(mocks.check).not.toHaveBeenCalled()
  })
  it("uses the authenticated user's AI settings and disables response caching", async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(mocks.check).toHaveBeenCalledWith(input, "private-key", "chosen-model")
  })
  it("does not return or log provider payloads", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.check.mockRejectedValue(new Error("PRIVATE DOCUMENT CONTENT"))
    const response = await POST(request())
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain("PRIVATE DOCUMENT")
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
