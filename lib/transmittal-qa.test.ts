import { describe, expect, it } from "vitest"
import { aggregateQa, qaInputKey, qaDocuments, QaStateSchema, type QaDocumentResult } from "./transmittal-qa"
import { createInitialTransmittalData, hasTransmittalFormData } from "../hooks/useTransmittalDraft"
import { createCopiedDraft, mapSavedTransmittalToAppData } from "../services/transmittal-mappers"

const requirement = { id: "permit", name: "Business permit", keywords: ["Acme", "2026"], mode: "exact" as const }
const doc = (id = "doc"): QaDocumentResult => ({ documentId: id, name: "Business permit.pdf", coverage: "full-text", findings: [{
  requirementId: "permit", filename: "match", explanation: "Identifies the permit", keywords: [
    { keyword: "Acme", status: "found", evidence: "Acme Corporation", page: 2 },
    { keyword: "2026", status: "found", evidence: "Valid 2026", page: 2 },
  ],
}] })
describe("QA aggregation", () => {
  it("passes all phrases in one file and permits a file to meet multiple requirements", () => {
    const file = doc(); file.findings.push({ ...file.findings[0], requirementId: "other" })
    expect(aggregateQa([requirement, { ...requirement, id: "other" }], [file]).map(r => r.status)).toEqual(["Passed", "Passed"])
  })
  it("never combines partial keyword matches in different files", () => {
    const a = doc("a"), b = doc("b")
    a.findings[0].keywords[0].status = "missing"; b.findings[0].keywords[1].status = "missing"
    expect(aggregateQa([requirement], [a, b])[0].status).toBe("Needs review")
  })
  it("reports missing files only when all files were successfully ruled out", () => {
    const file = doc(); file.findings[0].filename = "no-match"
    expect(aggregateQa([requirement], [file])[0].status).toBe("Missing file")
    expect(aggregateQa([requirement], [file, { documentId: "bad", name: "Unknown", findings: [], coverage: "unavailable", error: "Reattach" }])[0].status).toBe("Unable to check")
  })
  it("does not approve scanned, incomplete, missing or uncertain evidence", () => {
    const file = doc()
    file.coverage = "visual"; expect(aggregateQa([requirement], [file])[0].status).toBe("Needs review")
    file.coverage = "incomplete"; expect(aggregateQa([requirement], [file])[0].status).toBe("Unable to check")
    file.coverage = "full-text"; file.findings[0].keywords.pop()
    expect(aggregateQa([requirement], [file])[0].status).toBe("Needs review")
    file.findings[0].keywords = doc().findings[0].keywords
    file.findings[0].keywords[0].status = "missing"
    expect(aggregateQa([requirement], [file])[0].status).toBe("Missing keywords")
  })
})
describe("QA persistence compatibility", () => {
  it("loads legacy records, retains valid checklist/results and clears results on copy", () => {
    expect(mapSavedTransmittalToAppData({ id: "old" }).qa).toEqual({ requirements: [] })
    const qa = { requirements: [requirement], snapshot: { checkedAt: new Date().toISOString(), inputKey: "old", documents: [doc()] } }
    expect(mapSavedTransmittalToAppData({ id: "saved", qa }).qa).toEqual(qa)
    expect(createCopiedDraft({ id: "saved", qa }, "next").qa).toEqual({ requirements: [requirement] })
    expect(QaStateSchema.safeParse({ ...qa, content: "must never persist" }).success).toBe(false)
  })
  it("tracks checklist-only drafts and invalidates results when file metadata changes", () => {
    const data = createInitialTransmittalData()
    data.qa = { requirements: [requirement] }
    expect(hasTransmittalFormData(data)).toBe(true)
    const before = qaInputKey(data)
    data.items.push({ id: "manual", qty: "1", noOfItems: "1", description: "Permit", documentNumber: "", remarks: "" })
    expect(qaInputKey(data)).not.toBe(before)
    expect(qaDocuments(data.items)[0].id).toBe("item:manual")
  })
})
