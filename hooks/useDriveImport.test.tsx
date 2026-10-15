import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ page: vi.fn(), download: vi.fn(), parse: vi.fn() }))
vi.mock("../services/googleDriveService", async importOriginal => ({
  ...await importOriginal<typeof import("../services/googleDriveService")>(),
  listDriveFilePage: mocks.page,
  getFileContentAsBase64: mocks.download,
}))
vi.mock("../services/parse-api", () => ({ parseDocument: mocks.parse }))
import { useDriveImport } from "./useDriveImport"

const good = { id: "good-file-123", name: "good.pdf", mimeType: "application/pdf" }
const bad = { id: "bad-file-1234", name: "bad.pdf", mimeType: "application/pdf" }
const options = () => ({ apiBaseUrl: "", isDriveReady: true, addItems: vi.fn(), onStatus: vi.fn() })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.download.mockResolvedValue({ base64: "JVBERg==", mimeType: "application/pdf" })
  mocks.parse.mockResolvedValue({ items: [{ description: "Invoice", documentNumber: "INV-123", qty: "1", remarks: "" }] })
})

describe("Drive import integration", () => {
  it("rejects image-only imports and skips images in mixed imports", async () => {
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    const image = { id: "image-file-123", name: "scan.png", mimeType: "image/png" }
    await act(async () => {
      await expect(result.current.importFilesWithAi([image], "Import")).rejects.toThrow("Image imports are not supported")
      const summary = await result.current.importFilesWithAi([image, good], "Import")
      expect(summary).toMatchObject({ addedCount: 1, blockedImageCount: 1 })
    })
    expect(mocks.download).toHaveBeenCalledTimes(1)
    expect(mocks.download.mock.calls[0][0]).toBe(good.id)
  })
  it("reports download failures without inserting fake document rows", async () => {
    mocks.download.mockRejectedValueOnce(new Error("Check sharing permissions"))
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    await act(async () => {
      await expect(result.current.importFilesWithAi([bad], "Import")).rejects.toThrow("sharing permissions")
    })
    expect(props.addItems).not.toHaveBeenCalled()
    expect(mocks.parse).not.toHaveBeenCalled()
  })
  it("keeps successful files while reporting failed files and excludes folders", async () => {
    mocks.download.mockImplementation(async (id: string) => {
      if (id === bad.id) throw new Error("Download failed")
      return { base64: "JVBERg==", mimeType: "application/pdf" }
    })
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    await act(async () => {
      const summary = await result.current.importFilesWithAi([good, good, bad, { id: "folder", name: "folder", mimeType: "application/vnd.google-apps.folder" }], "Import")
      expect(summary).toMatchObject({ addedCount: 1, failedCount: 1, failedFiles: [bad] })
    })
    expect(props.addItems).toHaveBeenCalledTimes(1)
    expect(mocks.download).toHaveBeenCalledTimes(2)
  })
  it("skips files already included in the current transmittal", async () => {
    const props = { ...options(), existingItems: [{ id: "old", qty: "1", noOfItems: "1", documentNumber: "123", description: "Invoice", remarks: "", fileType: "gdrive" as const, fileSource: `https://drive.google.com/file/d/${good.id}/view` }] }
    const { result } = renderHook(() => useDriveImport(props))
    await act(async () => {
      expect(await result.current.importFilesWithAi([good], "Import")).toMatchObject({ addedCount: 0, skippedCount: 1 })
    })
    expect(mocks.download).not.toHaveBeenCalled()
  })
  it("appends browsing pages and preserves selection", async () => {
    mocks.page.mockResolvedValueOnce({ files: [good], nextPageToken: "next" })
      .mockResolvedValueOnce({ files: [bad] })
    const { result } = renderHook(() => useDriveImport(options()))
    await act(async () => { result.current.openModal() })
    act(() => result.current.toggle(good.id))
    await act(async () => { result.current.loadMoreDriveFiles() })
    expect(result.current.driveFiles).toEqual([good, bad])
    expect(result.current.driveSelected[good.id]).toBe(true)
    expect(result.current.hasMoreDriveFiles).toBe(false)
  })
})
