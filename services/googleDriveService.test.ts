import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearGoogleToken, driveApiFetch, driveTokenManager, getGoogleAccessToken,
  getFileContentAsBase64, listDriveFilePage, listFilesInFolder,
} from "./googleDriveService"

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
})

beforeEach(() => clearGoogleToken())
afterEach(() => { vi.restoreAllMocks(); clearGoogleToken() })

describe("Google Drive connection", () => {
  it("shares simultaneous token requests", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ accessToken: "token" }))
    await expect(Promise.all([getGoogleAccessToken(), getGoogleAccessToken()])).resolves.toEqual(["token", "token"])
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it("requests a real token refresh after an unauthorized Drive response", async () => {
    driveTokenManager.store("old")
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ accessToken: "new" }))
      .mockResolvedValueOnce(json({ files: [] }))
    await driveApiFetch("https://www.googleapis.com/drive/v3/files")
    expect(fetch.mock.calls[1][0]).toContain("/api/google-token?refresh=1")
    expect(new Headers(fetch.mock.calls[2][1]?.headers).get("Authorization")).toBe("Bearer new")
  })
  it("rejects empty token responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ accessToken: null }))
    await expect(getGoogleAccessToken()).rejects.toThrow("disconnected")
    expect(driveTokenManager.getValidToken()).toBeNull()
  })
  it("does not store a token from a request completed after logout", async () => {
    let resolve!: (response: Response) => void
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(done => { resolve = done }))
    const request = getGoogleAccessToken()
    clearGoogleToken()
    resolve(json({ accessToken: "old-user" }))
    await expect(request).rejects.toThrow("session changed")
    expect(driveTokenManager.getValidToken()).toBeNull()
  })
  it("reports inaccessible files instead of pretending a download succeeded", async () => {
    driveTokenManager.store("token")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 403))
    await expect(driveApiFetch("https://www.googleapis.com/drive/v3/files/id")).rejects.toThrow("sharing permissions")
  })
})

describe("Drive listing and downloads", () => {
  beforeEach(() => driveTokenManager.store("token"))
  it("escapes search text, supports shared drives and returns pagination", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ files: [], nextPageToken: "next" }))
    expect(await listDriveFilePage("Client's", "page-2")).toEqual({ files: [], nextPageToken: "next" })
    const url = new URL(String(fetch.mock.calls[0][0]))
    expect(url.searchParams.get("q")).toContain("Client\\'s")
    expect(url.searchParams.get("q")).toContain("mimeType != 'application/vnd.google-apps.folder'")
    expect(url.searchParams.get("pageToken")).toBe("page-2")
    expect(url.searchParams.get("includeItemsFromAllDrives")).toBe("true")
  })
  it("loads every folder page and passes the shared-link resource key", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({ files: [{ id: "one" }], nextPageToken: "next" }))
      .mockResolvedValueOnce(json({ files: [{ id: "two" }] }))
    expect(await listFilesInFolder("folder-id", "key")).toEqual([{ id: "one" }, { id: "two" }])
    expect(new URL(String(fetch.mock.calls[1][0])).searchParams.get("pageToken")).toBe("next")
    expect(new Headers(fetch.mock.calls[0][1]?.headers).get("X-Goog-Drive-Resource-Keys")).toBe("folder-id/key")
  })
  it("exports Google Docs to PDF before parsing", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("%PDF-1.4", { headers: { "Content-Type": "application/pdf" } }))
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "result", { value: "data:application/pdf;base64,JVBERg==" })
      this.onload?.call(this, new ProgressEvent("load") as ProgressEvent<FileReader>)
    })
    expect(await getFileContentAsBase64("document-id", "application/vnd.google-apps.document")).toEqual({ base64: "JVBERg==", mimeType: "application/pdf" })
    expect(String(fetch.mock.calls[0][0])).toContain("/document-id/export?mimeType=application%2Fpdf")
  })
  it("permits raster agency logos while keeping document image imports blocked", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("image", { headers: { "Content-Type": "image/png" } }))
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "result", { value: "data:image/png;base64,aGVsbG8=" })
      this.onload?.call(this, new ProgressEvent("load") as ProgressEvent<FileReader>)
    })
    await expect(getFileContentAsBase64("logo", "image/png")).rejects.toThrow("Image imports are not supported")
    expect(fetch).not.toHaveBeenCalled()
    await expect(getFileContentAsBase64("logo", "image/png", undefined, "agency-logo")).resolves.toEqual({ base64: "aGVsbG8=", mimeType: "image/png" })
  })
})
