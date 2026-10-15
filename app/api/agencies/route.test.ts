import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ session: vi.fn(), findMany: vi.fn(), create: vi.fn() }))
vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.session } },
  db: { agency: { findMany: mocks.findMany, create: mocks.create } },
}))
import { GET, POST } from "./route"
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })
beforeEach(() => { vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "https://ik.imagekit.io/test-account"); vi.stubEnv("IMAGEKIT_PRIVATE_KEY", "private-test-only"); vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: { id: "user-1" } }) })
describe("shared agency directory", () => {
  it("lists agencies from all creators with management permissions", async () => {
    mocks.findMany.mockResolvedValue([{ id: "mine", name: "Agency A", userId: "user-1" }, { id: "shared", name: "Agency B", userId: "user-2" }])
    const response = await GET(new Request("http://localhost/api/agencies"))
    expect(await response.json()).toEqual({ agencies: [{ id: "mine", name: "Agency A", canManage: true }, { id: "shared", name: "Agency B", canManage: false }] })
    expect(mocks.findMany.mock.calls[0][0]).not.toHaveProperty("where.userId")
  })
  it("stores company details and logo for a newly created agency", async () => {
    const agency = { name: "Agency A", logoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l1sAAAAASUVORK5CYII=", addressLine1: "123 Main Street" }
    const storedLogo = { logoUrl: "https://ik.imagekit.io/test-account/agency-logos/logo.png", logoFileId: "file-1", logoBase64: null }
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ url: storedLogo.logoUrl, fileId: "file-1" })))
    mocks.create.mockResolvedValue({ id: "agency", userId: "user-1", ...agency, ...storedLogo })
    const response = await POST(new Request("http://localhost/api/agencies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agency }) }))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "user-1", name: agency.name, addressLine1: agency.addressLine1, ...storedLogo }) })
    expect((await response.json()).agency.canManage).toBe(true)
  })
  it("rejects non-image logo content before storing it", async () => {
    const response = await POST(new Request("http://localhost/api/agencies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agency: { name: "Agency", logoBase64: "https://example.com/logo" } }) }))
    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("does not save inline bytes or create an agency if ImageKit upload fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unavailable", { status: 503 }))
    const response = await POST(new Request("http://localhost/api/agencies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agency: { name: "Agency", logoBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l1sAAAAASUVORK5CYII=" } }),
    }))
    expect(response.status).toBe(502)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await GET(new Request("http://localhost/api/agencies"))).status).toBe(401)
    expect(mocks.findMany).not.toHaveBeenCalled()
  })
})
