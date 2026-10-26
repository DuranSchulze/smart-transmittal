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
