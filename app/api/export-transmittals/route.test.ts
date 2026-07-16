import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock("@/server/auth", () => ({
  db: { transmittal: { findMany: mocks.findMany } },
}))

vi.mock("@/server/observability", () => ({
  withRouteMetrics: (_route: string, handler: unknown) => handler,
}))

import { GET } from "./route"

const request = (query = "", token = "export-token") =>
  new Request(`http://localhost/api/export-transmittals${query}`, {
    headers: { "x-api-token": token },
  })

describe("GET /api/export-transmittals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SEND_API_TOKEN = "export-token"
    mocks.findMany.mockResolvedValue([])
  })

  it("rejects query-string tokens and invalid header tokens", async () => {
    const response = await GET(
      request("?token=export-token", "wrong-token") as never,
    )
    expect(response.status).toBe(401)
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it("validates pagination inputs", async () => {
    expect((await GET(request("?limit=201") as never)).status).toBe(400)
    expect((await GET(request("?cursor=bad") as never)).status).toBe(400)
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it("queries one bounded page with a stable cursor", async () => {
    await GET(request("?limit=25&cursor=cknowncursor123") as never)
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { gt: "cknowncursor123" } },
        orderBy: { id: "asc" },
        take: 26,
      }),
    )
  })

  it("returns a continuation cursor without leaking the extra record", async () => {
    const makeRecord = (id: string) => ({
      id,
      project: { transmittalNumber: `TR-FP-${id}`, date: "2026-07-16" },
      preparedBy: "User",
      handDelivery: false,
      pickUp: false,
      courier: false,
      registeredMail: false,
      recipients: [],
      items: [],
      user: { name: "User", email: "user@example.com" },
    })
    mocks.findMany.mockResolvedValue([
      makeRecord("cursor-record-0001"),
      makeRecord("cursor-record-0002"),
    ])

    const response = await GET(request("?limit=1") as never)
    expect(await response.json()).toEqual(
      expect.objectContaining({
        hasMore: true,
        nextCursor: "cursor-record-0001",
        exportedTransmittals: 1,
      }),
    )
  })
})
