import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  listByUser: vi.fn(),
  listTransmittalSummaries: vi.fn(),
  createTransmittal: vi.fn(),
}))

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/server/transmittal-service", () => ({
  listByUser: mocks.listByUser,
  listTransmittalSummaries: mocks.listTransmittalSummaries,
  createTransmittal: mocks.createTransmittal,
}))

import { GET } from "./route"

describe("GET /api/transmittals file scopes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
  })

  it("loads the authenticated user's private file summaries", async () => {
    mocks.listTransmittalSummaries.mockResolvedValue({
      transmittals: [{ id: "mine" }],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    })

    const response = await GET(
      new Request("http://localhost/api/transmittals?scope=mine"),
    )

    expect(response.status).toBe(200)
    expect(mocks.listTransmittalSummaries).toHaveBeenCalledWith(
      "user-1",
      "mine",
      expect.objectContaining({ page: 1, pageSize: 12, status: "all" }),
    )
    expect(await response.json()).toEqual({
      transmittals: [{ id: "mine" }],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    })
  })

  it("uses the read-only all-users summary query for the team library", async () => {
    mocks.listTransmittalSummaries.mockResolvedValue({
      transmittals: [{ id: "team" }],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    })

    const response = await GET(
      new Request("http://localhost/api/transmittals?scope=all"),
    )

    expect(response.status).toBe(200)
    expect(mocks.listTransmittalSummaries).toHaveBeenCalledWith(
      "user-1",
      "all",
      expect.objectContaining({ page: 1, pageSize: 12, status: "all" }),
    )
  })

  it("passes pagination, search, owner, and sorting to the summary query", async () => {
    mocks.listTransmittalSummaries.mockResolvedValue({
      transmittals: [],
      pagination: { page: 2, pageSize: 24, total: 0, totalPages: 1 },
    })

    await GET(
      new Request(
        "http://localhost/api/transmittals?scope=all&page=2&pageSize=24&search=alpha&owner=alex&sort=owner-asc",
      ),
    )

    expect(mocks.listTransmittalSummaries).toHaveBeenCalledWith(
      "user-1",
      "all",
      expect.objectContaining({
        page: 2,
        pageSize: 24,
        search: "alpha",
        owner: "alex",
        sort: "owner-asc",
      }),
    )
  })

  it("rejects unauthenticated access to both libraries", async () => {
    mocks.getSession.mockResolvedValue(null)
    const response = await GET(
      new Request("http://localhost/api/transmittals?scope=all"),
    )

    expect(response.status).toBe(401)
    expect(mocks.listTransmittalSummaries).not.toHaveBeenCalled()
  })

  it("rejects unscoped requests instead of loading every full record", async () => {
    const response = await GET(
      new Request("http://localhost/api/transmittals"),
    )
    expect(response.status).toBe(400)
    expect(mocks.listTransmittalSummaries).not.toHaveBeenCalled()
  })
})
