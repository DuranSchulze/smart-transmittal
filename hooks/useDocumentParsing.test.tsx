import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ parse: vi.fn() }))
vi.mock("../services/parse-api", () => ({ parseDocument: mocks.parse }))
vi.mock("./useFileProcessing", () => ({
  useFileProcessing: (analyze: (b: string, m: string, n: string) => Promise<unknown>) => ({
    isProcessing: false, progress: { current: 0, total: 0 }, error: null,
    processFiles: async (files: File[], onResult: (r: unknown) => void) => {
      const results = []
      for (const file of files) {
        try { const r = await analyze("JVBERg==", "application/pdf", file.name); onResult(r); results.push(r) } catch { /* counted by useFileProcessing */ }
      }
      return results
    },
  }),
}))
import { useDocumentParsing } from "./useDocumentParsing"

const options = () => ({ apiBaseUrl: "", addItems: vi.fn(), mergeHeader: vi.fn(), onStatus: vi.fn() })
const file = (name: string) => new File(["%PDF"], name, { type: "application/pdf" })

beforeEach(() => vi.resetAllMocks())

// H1 / REQ-2: local upload names each file that needs review, with its reason.
describe("local upload honesty", () => {
  it("marks visual and filename-only rows and names them in the status", async () => {
    mocks.parse.mockImplementation(async (input: { fileName: string }) => input.fileName === "scan.pdf"
      ? { parser: "fallback", reason: "provider_timeout", readMethod: "none", error: "The document took too long to analyze.", fallbackCount: 1,
          items: [{ description: "scan", documentNumber: "", qty: "1", remarks: "The document took too long to analyze." }] }
      : input.fileName === "deed.pdf"
        ? { parser: "gemini-visual", readMethod: "visual", reason: "ocr_unavailable", items: [{ description: "Deed", documentNumber: "TD-1", qty: "1", remarks: "" }] }
        : { parser: "pdf-inspector", readMethod: "text", items: [{ description: "Invoice", documentNumber: "INV-1", qty: "1", remarks: "" }] })
    const props = options()
    const { result } = renderHook(() => useDocumentParsing(props))
    await act(async () => { await result.current.processUploadedFiles([file("invoice.pdf"), file("deed.pdf"), file("scan.pdf")]) })
    const rows = props.addItems.mock.calls.flatMap(call => call[0])
    expect(rows.map((row: { extraction?: unknown }) => row.extraction)).toEqual([
      { readMethod: "text" }, { readMethod: "visual", reason: "ocr_unavailable" }, { readMethod: "none", reason: "provider_timeout" },
    ])
    expect(rows[2].documentNumber).toBe("")
    const [message, type] = props.onStatus.mock.calls.at(-1)!
    expect(type).toBe("info")
    expect(message).toContain("deed.pdf (read visually by AI")
    expect(message).toMatch(/scan\.pdf \(The document took too long to analyze\. Filled from the file name/)
    expect(message).not.toMatch(/extraction/i)
    expect(mocks.parse.mock.calls[0][0]).toMatchObject({ flow: "upload" })
  })

  it("tells the user when the personal key could not be used", async () => {
    mocks.parse.mockResolvedValue({ parser: "gemini-text", readMethod: "text", keyClass: "system", personalKeyStatus: "unusable", items: [{ description: "Invoice", documentNumber: "INV-1", qty: "1", remarks: "" }] })
    const props = options()
    const { result } = renderHook(() => useDocumentParsing(props))
    await act(async () => { await result.current.processUploadedFiles([file("invoice.pdf")]) })
    expect(props.onStatus.mock.calls.at(-1)![0]).toMatch(/personal AI key could not be used/i)
  })
})
