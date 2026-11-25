import { describe, expect, it } from "vitest"
import { QaDocumentResultSchema, aggregateQa, qaCoverageLabel, type QaDocumentResult } from "./transmittal-qa"

const requirement = { id: "permit", name: "Business permit", keywords: ["Acme"], mode: "exact" as const }
const doc = (coverage: QaDocumentResult["coverage"], extra: Partial<QaDocumentResult> = {}): QaDocumentResult => ({
  documentId: "d", name: "Business permit.pdf", coverage, ...extra,
  findings: [{ requirementId: "permit", filename: "match", explanation: "", keywords: [{ keyword: "Acme", status: "found", evidence: "Acme", page: 1 }] }],
})

// H4 / REQ-4: scans stay review-only, with their own reason and recovery.
describe("QA visual coverage honesty", () => {
  it("never passes a visual document, and says it was scanned", () => {
    const [row] = aggregateQa([requirement], [doc("visual", { contentSource: "gemini-visual" })])
    expect(row.status).toBe("Needs review")
    expect(row.explanation).toMatch(/^Scanned — visually read, review required\./)
    expect(row.explanation).toMatch(/attach a text PDF/i)
  })

  it("keeps OCR-read scans review-only too", () => {
    expect(aggregateQa([requirement], [doc("visual", { contentSource: "ocr" })])[0].status).toBe("Needs review")
  })

  it("separates could-not-check from scanned, with a recovery action", () => {
    const [row] = aggregateQa([requirement], [doc("unavailable")])
    expect(row.status).toBe("Unable to check")
    expect(row.explanation).not.toMatch(/Scanned/)
    expect(row.explanation).toMatch(/retry|reattach/i)
  })

  it("labels coverage without letting visual masquerade as full text", () => {
    expect(qaCoverageLabel(doc("full-text"))).toBe("Full document text checked")
    expect(qaCoverageLabel(doc("visual"))).toBe("Scanned — visually read, review required")
    expect(qaCoverageLabel(doc("visual", { contentSource: "ocr" }))).toBe("Scanned — read with local OCR, review required")
    expect(qaCoverageLabel(doc("unavailable"))).toBe("Could not check")
  })

  it("accepts legacy results without the new optional fields", () => {
    expect(QaDocumentResultSchema.safeParse({ documentId: "d", name: "n", coverage: "visual", findings: [] }).success).toBe(true)
    expect(QaDocumentResultSchema.safeParse({ documentId: "d", name: "n", coverage: "visual", findings: [], contentSource: "ocr", reason: "ocr_timeout" }).success).toBe(true)
  })
})
