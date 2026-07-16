import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createInitialTransmittalData } from "./useTransmittalDraft"

const pdfMocks = vi.hoisted(() => {
  const pdf = {
    internal: {
      getNumberOfPages: () => 1,
      pageSize: { getWidth: () => 8.5, getHeight: () => 11 },
    },
    setPage: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
  }
  const worker: Record<string, any> = {}
  worker.from = vi.fn(() => worker)
  worker.set = vi.fn(() => worker)
  worker.toPdf = vi.fn(() => worker)
  worker.get = vi.fn(() => Promise.resolve(pdf))
  worker.outputPdf = vi.fn(() => Promise.resolve(new Blob(["pdf-output"])))
  return { factory: vi.fn(() => worker), pdf, worker }
})

vi.mock("html2pdf.js", () => ({ default: pdfMocks.factory }))

import { useExport } from "./useExport"

describe("useExport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = `
      <div id="preview-wrapper" style="transform: scale(0.75)">
        <div id="print-container">Transmittal preview</div>
      </div>
    `
  })

  it("generates a PDF blob and restores the preview transform", async () => {
    const data = createInitialTransmittalData()
    data.project.transmittalNumber = "202607-0035"
    const onStatus = vi.fn()
    const { result } = renderHook(() => useExport({ data, onStatus }))

    await act(async () => {
      await result.current.exportPdf()
    })

    expect(pdfMocks.factory).toHaveBeenCalledOnce()
    expect(pdfMocks.worker.outputPdf).toHaveBeenCalledWith("blob")
    expect(result.current.exportChoiceOpen).toBe(true)
    expect(result.current.pendingExportFormat).toBe("pdf")
    expect(result.current.pendingExportFileName).toMatch(
      /^202607-0035_[0-9T]+\.pdf$/,
    )
    expect(document.getElementById("preview-wrapper")?.style.transform).toBe(
      "scale(0.75)",
    )
    expect(onStatus).not.toHaveBeenCalled()
  })
})
