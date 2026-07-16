import { describe, expect, it } from "vitest"
import type { AppData } from "@/types"
import {
  TransmittalSaveRequestSchema,
  validateAppData,
  validatePartialAppData,
} from "./validation"

const createValidData = (): AppData => ({
  recipient: {
    to: "",
    email: "",
    company: "",
    attention: "",
    address: "",
    contactNumber: "",
  },
  project: {
    projectName: "",
    projectNumber: "",
    engagementRef: "",
    purpose: "",
    transmittalNumber: "202607-0001",
    department: "Admin",
    date: "2026-07-15",
    timeGenerated: "10:00 AM",
  },
  items: [],
  sender: {
    agencyName: "FILEPINO",
    addressLine1: "",
    addressLine2: "",
    website: "",
    mobile: "",
    telephone: "",
    email: "",
    logoBase64: null,
  },
  signatories: {
    preparedBy: "",
    preparedByRole: "",
    notedBy: "",
    notedByRole: "",
    timeReleased: "",
  },
  receivedBy: { name: "", date: "", time: "", remarks: "" },
  footerNotes: { acknowledgement: "", disclaimer: "" },
  notes: "",
  agencyId: null,
  transmissionMethod: {
    personalDelivery: false,
    pickUp: false,
    grabLalamove: false,
    registeredMail: false,
  },
})

describe("AppData validation", () => {
  it("accepts a structurally complete draft with empty business fields", () => {
    expect(validateAppData(createValidData()).success).toBe(true)
  })

  it("rejects malformed nested field types", () => {
    const malformed = {
      ...createValidData(),
      recipient: { ...createValidData().recipient, to: 42 },
    }

    const result = validateAppData(malformed)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["recipient", "to"])
    }
  })

  it("validates the current data and isDraft request envelope", () => {
    const result = TransmittalSaveRequestSchema.safeParse({
      data: createValidData(),
      isDraft: true,
    })
    expect(result.success).toBe(true)
  })

  it("accepts partial top-level draft data for patch helpers", () => {
    expect(validatePartialAppData({ notes: "updated" }).success).toBe(true)
  })
})
