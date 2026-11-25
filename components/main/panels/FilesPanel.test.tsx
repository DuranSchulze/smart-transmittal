import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FilesPanel } from "./FilesPanel"

afterEach(cleanup)

function setup(isDocumentProcessing = false) {
  const onDropFiles = vi.fn()
  const onOpenUploadModal = vi.fn()
  render(<FilesPanel items={[]} smartInput="" onSmartInputChange={vi.fn()} isAnalyzingText={false} onSmartAnalysis={vi.fn()} isParsing={false} parseProgress={{ current: 0, total: 0 }} isDocumentProcessing={isDocumentProcessing} onOpenUploadModal={onOpenUploadModal} onDropFiles={onDropFiles} isDriveReady={false} onOpenDriveModal={vi.fn()} onAddManualItem={vi.fn()} />)
  return { onDropFiles, onOpenUploadModal }
}

describe("FilesPanel local import", () => {
  it("shows drop feedback and passes computer files to the upload flow", () => {
    const { onDropFiles } = setup()
    const zone = screen.getByText("Drag & drop files here").parentElement!
    const files = [new File(["document"], "letter.pdf", { type: "application/pdf" })]
    fireEvent.dragEnter(zone, { dataTransfer: { types: ["Files"], dropEffect: "none" } })
    expect(screen.getByText("Drop files to add them")).toBeTruthy()
    fireEvent.drop(zone, { dataTransfer: { files } })
    expect(onDropFiles).toHaveBeenCalledWith(files)
    expect(screen.getByText("Drag & drop files here")).toBeTruthy()
  })

  it("keeps browsing available as an alternative", () => {
    const { onOpenUploadModal } = setup()
    fireEvent.click(screen.getByRole("button", { name: "Or browse files" }))
    expect(onOpenUploadModal).toHaveBeenCalledOnce()
  })

  it("blocks dropped files while documents are processing", () => {
    const { onDropFiles } = setup(true)
    fireEvent.drop(screen.getByText("Processing documents…").parentElement!, { dataTransfer: { files: [new File(["x"], "letter.pdf")] } })
    expect(onDropFiles).not.toHaveBeenCalled()
    expect((screen.getByRole("button", { name: "Or browse files" }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("FilesPanel review list (REQ-2)", () => {
  const base = { qty: "1", noOfItems: "1", documentNumber: "", remarks: "" }
  const render2 = (items: Parameters<typeof FilesPanel>[0]["items"]) => render(<FilesPanel items={items} smartInput="" onSmartInputChange={vi.fn()} isAnalyzingText={false} onSmartAnalysis={vi.fn()} isParsing={false} parseProgress={{ current: 0, total: 0 }} isDocumentProcessing={false} onOpenUploadModal={vi.fn()} onDropFiles={vi.fn()} isDriveReady={false} onOpenDriveModal={vi.fn()} onAddManualItem={vi.fn()} />)
  it("lists scanned and filename-only rows with a reason and recovery, but not text rows", () => {
    render2([
      { ...base, id: "a", description: "Invoice", fileSource: "invoice.pdf", extraction: { readMethod: "text" } },
      { ...base, id: "b", description: "Deed", fileSource: "deed.pdf", extraction: { readMethod: "visual", reason: "ocr_unavailable" } },
      { ...base, id: "c", description: "scan", fileSource: "scan.pdf", extraction: { readMethod: "none", reason: "provider_timeout" } },
      { ...base, id: "d", description: "Saved earlier", fileSource: "old.pdf" },
    ])
    const list = screen.getByRole("region", { name: /Needs review · 2/ })
    expect(list.textContent).toContain("deed.pdf")
    expect(list.textContent).toContain("Read visually by AI — Local OCR is unavailable.")
    expect(list.textContent).toContain("The document took too long to analyze. Filled from the file name. Retry later or split the file.")
    expect(list.textContent).not.toContain("invoice.pdf")
    expect(list.textContent).not.toContain("old.pdf")
  })
  it("shows nothing when every row was read from text", () => {
    render2([{ ...base, id: "a", description: "Invoice", extraction: { readMethod: "text" } }])
    expect(screen.queryByRole("region", { name: /Needs review/ })).toBeNull()
  })
})
