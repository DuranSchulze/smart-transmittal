import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createInitialTransmittalData } from "./useTransmittalDraft"
import { useTransmittalPersistence } from "./useTransmittalPersistence"

const mocks = vi.hoisted(() => ({
  createTransmittal: vi.fn(),
  updateTransmittal: vi.fn(),
  deleteTransmittal: vi.fn(),
  getNextTransmittalNumber: vi.fn(),
  getTransmittal: vi.fn(),
  getTransmittalSuggestions: vi.fn(),
}))

vi.mock("../services/transmittal-api", () => ({
  ...mocks,
}))

vi.mock("../services/transmittal-sheet-sync", () => ({
  syncFinalTransmittalToLinkedSheet: vi.fn(),
}))

const suggestions = {
  projectNames: ["Project A"],
  departments: ["Admin"],
  preparedByNames: [],
  preparedByRoles: [],
  notedByNames: [],
  notedByRoles: [],
}

const renderPersistence = () =>
  renderHook(() => {
    const [data, setData] = useState(createInitialTransmittalData())
    return useTransmittalPersistence({
      data,
      setData,
      hasFormData: false,
      isDocumentProcessing: false,
      userId: "user-1",
      apiBaseUrl: "http://localhost",
    })
  })

describe("useTransmittalPersistence lazy loading", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTransmittalSuggestions.mockResolvedValue(suggestions)
  })

  it("does not load files, numbering, or suggestions during startup", () => {
    renderPersistence()
    expect(mocks.getTransmittal).not.toHaveBeenCalled()
    expect(mocks.getNextTransmittalNumber).not.toHaveBeenCalled()
    expect(mocks.getTransmittalSuggestions).not.toHaveBeenCalled()
  })

  it("deduplicates concurrent suggestion requests", async () => {
    const { result } = renderPersistence()
    await act(async () => {
      await Promise.all([
        result.current.loadSuggestions(),
        result.current.loadSuggestions(),
      ])
    })
    expect(mocks.getTransmittalSuggestions).toHaveBeenCalledTimes(1)
    expect(result.current.suggestions.projectNames).toEqual(["Project A"])
  })

  it("loads only the requested complete transmittal when opening a file", async () => {
    mocks.getTransmittal.mockResolvedValue({
      id: "transmittal-1",
      isOwner: true,
      project: { transmittalNumber: "202607-0001" },
      recipients: [],
      items: [],
      sender: {},
      receivedBy: {},
      footerNotes: {},
    })
    const { result } = renderPersistence()
    await act(async () => {
      await result.current.openTransmittal("transmittal-1")
    })
    expect(mocks.getTransmittal).toHaveBeenCalledTimes(1)
    expect(mocks.getTransmittal).toHaveBeenCalledWith(
      "transmittal-1",
      "http://localhost",
    )
  })
})
