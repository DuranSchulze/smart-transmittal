import { beforeEach, describe, expect, it } from "vitest"
import { storage } from "./storage"

describe("storage", () => {
  beforeEach(() => window.localStorage.clear())

  it("round-trips onboarding state", () => {
    expect(storage.getOnboardingState()).toBeNull()
    expect(storage.setOnboardingState("completed")).toBe(true)
    expect(storage.getOnboardingState()).toBe("completed")
  })

  it("scopes AI prompt dismissal by user", () => {
    storage.dismissAiPrompt("user-a")
    expect(storage.isAiPromptDismissed("user-a")).toBe(true)
    expect(storage.isAiPromptDismissed("user-b")).toBe(false)
  })

  it("preserves the existing linked-sheet storage key", () => {
    storage.setLinkedSheetId("sheet-123")
    expect(window.localStorage.getItem("transmittal_linked_sheet_id")).toBe(
      "sheet-123",
    )
    expect(storage.getLinkedSheetId()).toBe("sheet-123")
    storage.clearLinkedSheetId()
    expect(storage.getLinkedSheetId()).toBeNull()
  })
})
