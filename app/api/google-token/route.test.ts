import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ session: vi.fn(), account: vi.fn(), update: vi.fn() }))
vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.session } },
  db: { account: { findFirst: mocks.account, update: mocks.update } },
}))
import { GET } from "./route"
import { afterEach } from "vitest"

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("GOOGLE_CLIENT_ID", "client")
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret")
  mocks.session.mockResolvedValue({ user: { id: "user" } })
  mocks.account.mockResolvedValue({ id: "account", providerId: "google", accessToken: "old", refreshToken: "refresh", accessTokenExpiresAt: new Date(Date.now() + 3_600_000) })
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("Google token renewal", () => {
  it("actually renews a rejected token even before its stored expiry", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ access_token: "renewed", expires_in: 3600 })))
    const response = await GET(new Request("http://localhost/api/google-token?refresh=1"))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ accessToken: "renewed" })
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accessToken: "renewed" }) }))
  })
  it("returns an unexpired token with expiry and no caching", async () => {
    const response = await GET(new Request("http://localhost/api/google-token"))
    expect(await response.json()).toMatchObject({ accessToken: "old", expiresAt: expect.any(String) })
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("requires authentication before reading account credentials", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await GET(new Request("http://localhost/api/google-token?refresh=1"))).status).toBe(401)
    expect(mocks.account).not.toHaveBeenCalled()
  })
})
