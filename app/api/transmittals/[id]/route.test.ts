import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTransmittalById: vi.fn(),
  patchTransmittal: vi.fn(),
  updateTransmittal: vi.fn(),
  deleteTransmittal: vi.fn(),
}))

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/server/transmittal-service", () => ({
  getTransmittalById: mocks.getTransmittalById,
  patchTransmittal: mocks.patchTransmittal,
  updateTransmittal: mocks.updateTransmittal,
  deleteTransmittal: mocks.deleteTransmittal,
}))

vi.mock("@/server/observability", () => ({
  withRouteMetrics: (_route: string, handler: unknown) => handler,
}))

import { GET } from "./route"

const context = { params: Promise.resolve({ id: "transmittal-1" }) }

describe("GET /api/transmittals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.getTransmittalById.mockResolvedValue({
      id: "transmittal-1",
      isOwner: true,
      items: [],
      recipients: [],
    })
  })

  it("loads one full transmittal for the authenticated user", async () => {
    const response = await GET(
      new Request("http://localhost/api/transmittals/transmittal-1"),
      context,
    )
    expect(response.status).toBe(200)
    expect(mocks.getTransmittalById).toHaveBeenCalledWith(
      "transmittal-1",
      "user-1",
    )
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: "transmittal-1", isOwner: true }),
    )
  })

  it("rejects unauthenticated detail requests", async () => {
    mocks.getSession.mockResolvedValue(null)
    const response = await GET(
      new Request("http://localhost/api/transmittals/transmittal-1"),
      context,
    )
    expect(response.status).toBe(401)
    expect(mocks.getTransmittalById).not.toHaveBeenCalled()
  })
})
