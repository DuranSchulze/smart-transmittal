import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ download: vi.fn(), parse: vi.fn(), prepare: vi.fn() }))
vi.mock("../services/googleDriveService", async importOriginal => ({
  ...await importOriginal<typeof import("../services/googleDriveService")>(),
  getFileContentAsBase64: mocks.download,
}))
vi.mock("../services/parse-api", () => ({ parseDocument: mocks.parse }))
vi.mock("../services/qa-document-content", () => ({ prepareQaContent: mocks.prepare }))
import { ParseRequestError } from "../lib/parse-reasons"
import { describeDriveImport, useDriveImport } from "./useDriveImport"

const text = { id: "text-file-123", name: "Invoice INV-1.pdf", mimeType: "application/pdf" }
const scan = { id: "scan-file-123", name: "scan.pdf", mimeType: "application/pdf" }
const options = () => ({ apiBaseUrl: "", isDriveReady: true, addItems: vi.fn(), onStatus: vi.fn() })
const timeoutCopy = "The document took too long to analyze."

beforeEach(() => {
  vi.resetAllMocks()
  mocks.download.mockResolvedValue({ base64: "JVBERg==", mimeType: "application/pdf" })
  mocks.prepare.mockImplementation(async (content: string, mimeType: string) => ({ content, mimeType, isText: false }))
})

// H2 / REQ-3: Drive import keeps the reason and names the file.
describe("Drive failure reasons", () => {
  it("keeps the fallback reason in remarks instead of the import remark", async () => {
    mocks.parse.mockResolvedValue({
      parser: "fallback", reason: "provider_timeout", readMethod: "none", error: timeoutCopy, fallbackCount: 1,
      items: [{ description: "scan", documentNumber: "", qty: "1", remarks: timeoutCopy }],
    })
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    let summary: Awaited<ReturnType<typeof result.current.importFilesWithAi>> | undefined
    await act(async () => { summary = await result.current.importFilesWithAi([scan], "Drive selection") })
    const row = props.addItems.mock.calls[0][0][0]
    expect(row.remarks).toBe(timeoutCopy)
    expect(row.documentNumber).toBe("")
    expect(row.extraction).toEqual({ readMethod: "none", reason: "provider_timeout" })
    expect(describeDriveImport(summary!)).toContain("scan.pdf")
    expect(describeDriveImport(summary!)).toMatch(/took too long/i)
    expect(mocks.parse.mock.calls[0][0]).toMatchObject({ flow: "drive-selection" })
  })

  it("names a parse rejection with the shared reason vocabulary", async () => {
    mocks.parse.mockImplementation(async (input: { fileName: string }) => {
      if (input.fileName === scan.name) throw new ParseRequestError(timeoutCopy, "provider_timeout")
      return { parser: "gemini-text", readMethod: "text", items: [{ description: "Invoice", documentNumber: "INV-1", qty: "1", remarks: "" }] }
    })
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    let summary: Awaited<ReturnType<typeof result.current.importFilesWithAi>> | undefined
    await act(async () => { summary = await result.current.importFilesWithAi([text, scan], "Drive bulk import") })
    const rows = props.addItems.mock.calls.flatMap(call => call[0])
    expect(rows).toHaveLength(2)
    expect(rows[0].remarks).toBe("Imported from Google Drive")
    expect(rows[1]).toMatchObject({ remarks: timeoutCopy, extraction: { readMethod: "none", reason: "provider_timeout" } })
    expect(summary!.reviewFiles).toEqual([{ name: "scan.pdf", note: expect.stringMatching(/took too long/i) }])
    expect(describeDriveImport(summary!)).not.toContain("Invoice INV-1.pdf")
  })

  it("lists visually read files for review", async () => {
    mocks.parse.mockResolvedValue({ parser: "gemini-visual", readMethod: "visual", reason: "ocr_unavailable", items: [{ description: "Deed", documentNumber: "TD-1", qty: "1", remarks: "" }] })
    const props = options()
    const { result } = renderHook(() => useDriveImport(props))
    let summary: Awaited<ReturnType<typeof result.current.importFilesWithAi>> | undefined
    await act(async () => { summary = await result.current.importFilesWithAi([scan], "Drive link import") })
    expect(describeDriveImport(summary!)).toMatch(/scan\.pdf \(read visually by AI/)
    expect(mocks.parse.mock.calls[0][0]).toMatchObject({ flow: "drive-link" })
  })
})
