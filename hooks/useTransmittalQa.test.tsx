import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), read: vi.fn(), metadata: vi.fn(), download: vi.fn(), prepare: vi.fn() }))
vi.mock("../lib/api-client", async importOriginal => ({ ...await importOriginal<typeof import("../lib/api-client")>(), apiFetch: mocks.fetch }))
vi.mock("../services/qa-document-content", () => ({ readQaFile: mocks.read, prepareQaContent: mocks.prepare }))
vi.mock("../services/googleDriveService", () => ({ getFileMetadata: mocks.metadata, getFileContentAsBase64: mocks.download }))
import { useTransmittalQa } from "./useTransmittalQa"
import { createInitialTransmittalData } from "./useTransmittalDraft"
import type { AppData } from "../types"
import type { QaDocumentResult } from "../lib/transmittal-qa"
const doc = (id: string) => ({ id, name: "Permit.pdf", mimeType: "application/pdf", revision: "one" })
const content = { content: "pdf content", mimeType: "application/pdf", isText: false }
const response = (id: string): QaDocumentResult => ({ documentId: id, name: "Permit.pdf", coverage: "full-text", findings: [{ requirementId: "permit", filename: "match", explanation: "Permit", keywords: [] }] })
function initial(ids = ["a"]): AppData {
  const data = createInitialTransmittalData()
  data.qa = { requirements: [{ id: "permit", name: "Permit", keywords: [], mode: "exact" }] }
  data.items = ids.map(id => ({ id: `item-${id}`, qty: "1", noOfItems: "1", documentNumber: "", description: "Permit", remarks: "", document: doc(id) }))
  return data
}
function setup(data = initial()) {
  return renderHook(() => {
    const [state, setState] = useState(data)
    return { qa: useTransmittalQa(state, setState, ""), state, setState }
  })
}
beforeEach(() => { vi.clearAllMocks(); mocks.fetch.mockImplementation(async (_url, options) => response(JSON.parse(options.body).document.id)); mocks.read.mockResolvedValue(content); mocks.prepare.mockResolvedValue(content) })
describe("QA session lifecycle", () => {
  it("reattaches without inserting rows and invalidates an earlier snapshot", async () => {
    const { result } = setup()
    act(() => result.current.qa.registerDocument(doc("a"), content))
    await act(async () => { await result.current.qa.run() })
    expect(result.current.qa.rows[0].status).toBe("Passed")
    expect(result.current.qa.previousResults).toBe(false)
    await act(async () => { await result.current.qa.reattach("a", new File(["replacement"], "Replacement.pdf")) })
    expect(result.current.state.items).toHaveLength(1)
    expect(result.current.state.items[0].document.name).toBe("Replacement.pdf")
    expect(result.current.qa.outdated).toBe(true)
  })
  it("keeps successful results on partial failure and retries only failed checks", async () => {
    const { result } = setup(initial(["a", "b"]))
    act(() => { result.current.qa.registerDocument(doc("a"), content); result.current.qa.registerDocument(doc("b"), content) })
    mocks.fetch.mockRejectedValueOnce(new Error("Quota exceeded")).mockResolvedValueOnce(response("b"))
    await act(async () => { await result.current.qa.run() })
    expect(result.current.qa.snapshot.documents).toHaveLength(2)
    expect(result.current.qa.snapshot.documents[0].error).toBe("Quota exceeded")
    mocks.fetch.mockClear(); mocks.fetch.mockResolvedValue(response("a"))
    await act(async () => { await result.current.qa.run(true) })
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(result.current.qa.snapshot.documents.some(d => d.error)).toBe(false)
  })
  it("ignores late responses when the checklist changes", async () => {
    let finish: (result: QaDocumentResult) => void
    mocks.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const { result } = setup()
    act(() => result.current.qa.registerDocument(doc("a"), content))
    let running: Promise<void>
    act(() => { running = result.current.qa.run() })
    act(() => result.current.qa.updateRequirements([{ id: "other", name: "Other", mode: "exact", keywords: [] }]))
    await act(async () => { finish(response("a")); await running })
    expect(result.current.qa.snapshot).toBeUndefined()
    expect(result.current.qa.error).toContain("changed")
  })
  it("clears bytes on switching sessions and when the last associated item is removed", async () => {
    const { result } = setup()
    act(() => result.current.qa.registerDocument(doc("a"), content))
    act(() => result.current.setState(previous => ({ ...previous, items: [] })))
    expect(result.current.qa.hasContent("a")).toBe(false)
    act(() => { result.current.qa.registerDocument(doc("b"), content); result.current.qa.resetSession() })
    expect(result.current.qa.hasContent("b")).toBe(false)
  })
  it("treats loaded results as previous and missing local content as unverified", async () => {
    const data = initial()
    data.qa.snapshot = { checkedAt: new Date().toISOString(), inputKey: "prior", documents: [response("a")] }
    const { result } = setup(data)
    expect(result.current.qa.previousResults).toBe(true)
    await act(async () => { await result.current.qa.run() })
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(result.current.qa.rows[0].status).toBe("Unable to check")
  })
  it("downloads Drive content anew on every run and reports inaccessible files", async () => {
    const data = initial()
    data.items[0].document.driveId = "drive-id"
    mocks.metadata.mockResolvedValue({ name: "Permit.pdf", mimeType: "application/pdf" })
    mocks.download.mockResolvedValue({ base64: "fresh", mimeType: "application/pdf" })
    const { result } = setup(data)
    await act(async () => { await result.current.qa.run() })
    await act(async () => { await result.current.qa.run() })
    expect(mocks.download).toHaveBeenCalledTimes(2)
    mocks.download.mockRejectedValueOnce(new Error("Cannot access this Google file"))
    await act(async () => { await result.current.qa.run() })
    expect(result.current.qa.snapshot.documents[0].error).toContain("Cannot access")
  })
  it("rejects an incomplete response even if it is structurally valid", async () => {
    mocks.fetch.mockResolvedValue({ ...response("a"), findings: [] })
    const { result } = setup()
    act(() => result.current.qa.registerDocument(doc("a"), content))
    await act(async () => { await result.current.qa.run() })
    expect(result.current.qa.snapshot.documents[0].error).toContain("Incomplete")
  })
})
