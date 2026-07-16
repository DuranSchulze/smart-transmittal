import { describe, expect, it } from "vitest"
import { createInitialTransmittalData } from "../hooks/useTransmittalDraft"
import { generateTransmittalDocx } from "./docxGenerator"

describe("DOCX generation", () => {
  it("creates a non-empty Office Open XML package", async () => {
    const data = createInitialTransmittalData()
    data.project.transmittalNumber = "202607-0035"
    data.project.projectName = "Production Export Test"
    data.recipient.to = "Test Recipient"
    data.items = [
      {
        id: "item-1",
        noOfItems: "1",
        qty: "1",
        documentNumber: "DOC-001",
        description: "Export verification drawing",
        remarks: "For review",
      },
    ]

    const blob = await generateTransmittalDocx(data)
    const bytes = new Uint8Array(await blob.arrayBuffer())

    expect(blob.type).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    expect(blob.size).toBeGreaterThan(1_000)
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b])
  })
})
