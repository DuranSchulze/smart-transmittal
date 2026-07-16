import { describe, expect, it } from "vitest"
import { createInitialTransmittalData } from "../hooks/useTransmittalDraft"
import { computeWorkspaceProgress } from "./workspace-progress"

describe("computeWorkspaceProgress", () => {
  it("marks files and review incomplete until documents exist", () => {
    const progress = computeWorkspaceProgress(createInitialTransmittalData())
    expect(progress.files).toBe(false)
    expect(progress.review).toBe(false)
  })

  it("marks the file workspace complete when an item exists", () => {
    const data = createInitialTransmittalData()
    data.items.push({
      id: "1",
      qty: "1",
      noOfItems: "1",
      documentNumber: "DOC-1",
      description: "Drawing",
      remarks: "",
    })
    expect(computeWorkspaceProgress(data).files).toBe(true)
  })
})
