import { describe, expect, it } from "vitest"
import {
  createCopiedDraft,
  mapSavedTransmittalToAppData,
  validateTransmittalNumber,
} from "./transmittal-mappers"
import type { SavedTransmittalRecord } from "./transmittal-api"

const record: SavedTransmittalRecord = {
  id: "record-1",
  transmittalNumber: "TR-FP-202607-0001",
  project: {
    projectName: "Project One",
    transmittalNumber: "TR-FP-202607-0001",
  },
  recipients: [{ recipientName: "Client" }],
  items: [
    {
      id: "item-1",
      qty: "1",
      noOfItems: "1",
      documentNumber: "FP-DWG-001",
      description: "Drawing",
      remarks: "Issued",
      fileType: "upload",
    },
  ],
  sender: {},
  receivedBy: {},
  footerNotes: {},
}

describe("transmittal mappers", () => {
  it("maps persisted records into complete AppData", () => {
    const data = mapSavedTransmittalToAppData(record)
    expect(data.project.transmittalNumber).toBe("202607-0001")
    expect(data.recipient.to).toBe("Client")
    expect(data.items[0]).toMatchObject({
      id: "item-1",
      documentNumber: "FP-DWG-001",
      fileType: "upload",
    })
  })

  it("creates a copy with a fresh number, timestamp, and item IDs", () => {
    const copy = createCopiedDraft(
      record,
      "202607-0002",
      new Date("2026-07-15T08:30:00.000Z"),
    )
    expect(copy.project.transmittalNumber).toBe("202607-0002")
    expect(copy.project.date).toBe("2026-07-15")
    expect(copy.items[0].id).not.toBe("item-1")
  })

  it("detaches another user's agency when copying a shared transmittal", () => {
    const copy = createCopiedDraft(
      { ...record, agencyId: "foreign-agency", isOwner: false },
      "202607-0002",
    )
    expect(copy.agencyId).toBeNull()
    expect(copy.sender).toEqual(expect.any(Object))
  })

  it("ignores the active record but detects another duplicate", () => {
    expect(
      validateTransmittalNumber("202607-0001", [record], "record-1")
        .isDuplicate,
    ).toBe(false)
    expect(
      validateTransmittalNumber("202607-0001", [record], null).isDuplicate,
    ).toBe(true)
  })
})
