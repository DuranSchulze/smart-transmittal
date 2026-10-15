import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  agency: vi.fn(),
  create: vi.fn(),
}))

vi.mock("./auth", () => ({
  db: {
    transmittal: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}))

import { createTransmittal, getTransmittalById } from "./transmittal-service"
import { createInitialTransmittalData } from "../hooks/useTransmittalDraft"

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

it("allows a user to save a transmittal using an agency created by someone else", async () => {
  mocks.agency.mockResolvedValue({ id: "shared-agency" })
  mocks.create.mockResolvedValue({ id: "saved", project: {}, department: null })
  mocks.transaction.mockImplementation(async callback => callback({
    agency: { findFirst: mocks.agency }, transmittal: { create: mocks.create },
  }))
  const data = createInitialTransmittalData()
  data.agencyId = "shared-agency"
  data.project.transmittalNumber = "202610-0001"
  await createTransmittal("user-2", data, true)
  expect(mocks.agency).toHaveBeenCalledWith({ where: { id: "shared-agency" }, select: { id: true } })
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-2", agencyId: "shared-agency", sender: data.sender }) }))
})
