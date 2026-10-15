import { act, renderHook } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ metadata: vi.fn(), folder: vi.fn() }))
vi.mock("../services/googleDriveService", async importOriginal => ({
  ...await importOriginal<typeof import("../services/googleDriveService")>(),
  getFileMetadata: mocks.metadata, listFilesInFolder: mocks.folder,
}))
import { useSmartImport } from "./useSmartImport"
const props = () => ({ isDriveReady: true, addItems: vi.fn(), importDriveFiles: vi.fn(), onStatus: vi.fn() })
beforeEach(() => vi.resetAllMocks())
it("rejects unrelated links before making Google requests", async () => {
  const options = props()
  const { result } = renderHook(() => useSmartImport(options))
  act(() => result.current.setSmartInput("https://other.example/file/d/abcdefghijk"))
  await act(async () => { await result.current.analyze() })
  expect(mocks.metadata).not.toHaveBeenCalled()
  expect(options.onStatus).toHaveBeenLastCalledWith(expect.stringContaining("valid Google"), "error")
})
it("resolves an open?id folder link and preserves its shared resource key", async () => {
  const options = props()
  options.importDriveFiles.mockResolvedValue({ addedCount: 1, fallbackCount: 0 })
  mocks.metadata.mockResolvedValue({ id: "abcdefghijk", name: "Folder", mimeType: "application/vnd.google-apps.folder" })
  const files = [{ id: "document-123", name: "Invoice", mimeType: "application/pdf" }]
  mocks.folder.mockResolvedValue(files)
  const { result } = renderHook(() => useSmartImport(options))
  act(() => result.current.setSmartInput("https://drive.google.com/open?id=abcdefghijk&resourcekey=shared-key"))
  await act(async () => { await result.current.analyze() })
  expect(mocks.metadata).toHaveBeenCalledWith("abcdefghijk", "shared-key")
  expect(mocks.folder).toHaveBeenCalledWith("abcdefghijk", "shared-key")
  expect(options.importDriveFiles).toHaveBeenCalledWith(files, "Drive link import")
  expect(result.current.smartInput).toBe("")
})
it("keeps the pasted link and shows actionable permission errors", async () => {
  const options = props()
  mocks.metadata.mockRejectedValue(new Error("Check sharing permissions and your Google account."))
  const { result } = renderHook(() => useSmartImport(options))
  const link = "https://drive.google.com/file/d/abcdefghijk/view"
  act(() => result.current.setSmartInput(link))
  await act(async () => { await result.current.analyze() })
  expect(result.current.smartInput).toBe(link)
  expect(options.onStatus).toHaveBeenLastCalledWith("Check sharing permissions and your Google account.", "error")
})
