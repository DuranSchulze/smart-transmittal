import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}))

vi.mock("./auth", () => ({
  db: {
    transmittal: { findFirst: mocks.findFirst },
  },
}))

import { getTransmittalById } from "./transmittal-service"

describe("getTransmittalById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findFirst.mockResolvedValue(null)
  })

  it("restricts full transmittal access to the owner while Open All is disabled", async () => {
    await expect(
      getTransmittalById("transmittal-1", "user-1"),
    ).rejects.toMatchObject({ status: 404 })

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "transmittal-1", userId: "user-1" },
      }),
    )
  })
})
