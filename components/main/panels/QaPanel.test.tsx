import { fireEvent, render, screen, within, cleanup } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QaPanel } from "./QaPanel"
import { ReviewPanel } from "./ReviewPanel"
import { useTransmittalQa } from "../../../hooks/useTransmittalQa"
import { createInitialTransmittalData } from "../../../hooks/useTransmittalDraft"

function Harness() {
  const [data, setData] = useState(createInitialTransmittalData())
  const qa = useTransmittalQa(data, setData, "")
  return <><QaPanel qa={qa} isImporting={false} /><ReviewPanel data={data} onEdit={vi.fn()} onSave={vi.fn()} onExportPdf={vi.fn()} onExportDocx={vi.fn()} isSaving={false} isGeneratingPdf={false} isGeneratingDocx={false} /><output aria-label="Requirements order">{qa.requirements.map(r => r.name).join(",")}</output></>
}
afterEach(cleanup)
describe("QA checklist interface", () => {
  it("edits, reorders, and removes requirements without blocking save/export", async () => {
    render(<Harness />)
    expect(screen.getByRole("button", { name: "Run QA" }).hasAttribute("disabled")).toBe(true)
    const checklist = screen.getByRole("region", { name: "Required documents" })

    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Expected document name"), { target: { value: "Permit" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Required phrases for Permit" }), { target: { value: "Acme\n2026" } })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "semantic" } })
    fireEvent.click(screen.getByRole("button", { name: "Add document" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(within(checklist).getByText("Permit")).toBeDefined()
    expect(within(checklist).getByText(/2 required phrases.*AI meaning matching/)).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Add" }))
    fireEvent.change(screen.getByLabelText("Expected document name"), { target: { value: "Invoice" } })
    fireEvent.click(screen.getByRole("button", { name: "Add document" }))
    expect(screen.getByLabelText("Requirements order").textContent).toBe("Permit,Invoice")

    fireEvent.click(screen.getByRole("button", { name: "Move document 2 up" }))
    expect(screen.getByLabelText("Requirements order").textContent).toBe("Invoice,Permit")
    fireEvent.click(screen.getByRole("button", { name: "Delete document 1" }))
    expect(screen.getByLabelText("Requirements order").textContent).toBe("Permit")
    fireEvent.click(screen.getByRole("button", { name: "Run QA" }))
    const results = await screen.findByRole("region", { name: "QA results" })
    expect(within(results).getByText("Missing file · 1")).toBeDefined()
    expect(screen.getByRole("button", { name: "Save transmittal" }).hasAttribute("disabled")).toBe(false)
    expect(screen.getByRole("button", { name: "PDF" }).hasAttribute("disabled")).toBe(false)
  })

  it("opens the document editor dialog and saves changes to an existing requirement", () => {
    const qa = {
      ...({} as ReturnType<typeof useTransmittalQa>),
      requirements: [
        { id: "req-1", name: "Permit", keywords: ["Acme"], mode: "exact" as const },
      ],
      updateRequirements: vi.fn(),
      running: false,
      progress: { current: 0, total: 0 },
      error: "",
      snapshot: undefined,
      outdated: false,
      previousResults: false,
      rows: [],
      documents: [],
      hasContent: () => false,
    } as unknown as ReturnType<typeof useTransmittalQa>

    render(<QaPanel qa={qa} isImporting={false} />)
    fireEvent.click(screen.getByRole("button", { name: "Edit document 1: Permit" }))
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Expected document name"), { target: { value: "Business permit" } })
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }))

    expect(qa.updateRequirements).toHaveBeenCalledWith([
      { id: "req-1", name: "Business permit", keywords: ["Acme"], mode: "exact" },
    ])
  })
})
