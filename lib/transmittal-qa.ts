import { z } from "zod"
import type { AppData, TransmittalItem } from "../types"

export const MAX_QA_CONTENT = 25 * 1024 * 1024
export const DocumentReferenceSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(500),
  mimeType: z.string().max(200),
  revision: z.string().min(1).max(200),
  driveId: z.string().max(200).optional(),
  resourceKey: z.string().max(300).optional(),
}).strict()
export const QaRequirementSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(500),
  keywords: z.array(z.string().trim().min(1).max(300)).max(30),
  mode: z.enum(["exact", "semantic"]),
}).strict()
// Empty names are allowed while editing a saved draft, but never in a QA request.
export const QaDraftRequirementSchema = QaRequirementSchema.extend({ name: z.string().max(500) })
export const QaKeywordFindingSchema = z.object({
  keyword: z.string().max(300),
  status: z.enum(["found", "missing", "uncertain"]),
  evidence: z.string().max(600),
  page: z.number().int().positive().nullable(),
}).strict()
export const QaFindingSchema = z.object({
  requirementId: z.string().max(200),
  filename: z.enum(["match", "no-match", "uncertain"]),
  explanation: z.string().max(1000),
  keywords: z.array(QaKeywordFindingSchema).max(30),
}).strict()
export const QaDocumentResultSchema = z.object({
  documentId: z.string().max(200),
  name: z.string().max(500),
  coverage: z.enum(["full-text", "visual", "incomplete", "unavailable"]),
  findings: z.array(QaFindingSchema).max(100),
  error: z.string().max(1000).optional(),
}).strict()
export const QaSnapshotSchema = z.object({
  checkedAt: z.string().datetime(),
  inputKey: z.string().max(300_000),
  documents: z.array(QaDocumentResultSchema).max(200),
}).strict()
export const QaStateSchema = z.object({
  requirements: z.array(QaDraftRequirementSchema).max(100),
  snapshot: QaSnapshotSchema.optional(),
}).strict()
export const QaRequestSchema = z.object({
  document: DocumentReferenceSchema,
  content: z.string().min(1).max(MAX_QA_CONTENT),
  isText: z.boolean(),
  textComplete: z.boolean().optional(),
  requirements: z.array(QaRequirementSchema).min(1).max(100),
}).strict().refine(value => new Set(value.requirements.map(r => r.id)).size === value.requirements.length, "Requirement IDs must be unique")

export type DocumentReference = z.infer<typeof DocumentReferenceSchema>
export type QaRequirement = z.infer<typeof QaDraftRequirementSchema>
export type QaKeywordFinding = z.infer<typeof QaKeywordFindingSchema>
export type QaFinding = z.infer<typeof QaFindingSchema>
export type QaDocumentResult = z.infer<typeof QaDocumentResultSchema>
export type QaSnapshot = z.infer<typeof QaSnapshotSchema>
export type QaState = z.infer<typeof QaStateSchema>
export type QaRequest = z.infer<typeof QaRequestSchema>
export type QaStatus = "Passed" | "Missing file" | "Missing keywords" | "Needs review" | "Unable to check"
export type QaRow = { requirement: QaRequirement; status: QaStatus; candidates: { document: QaDocumentResult; finding: QaFinding }[]; explanation: string }
export type QaDocumentContent = { content: string; mimeType: string; isText: boolean; textComplete?: boolean }

export const normalizeQaText = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()

/** Includes manual/unavailable rows so adding or deleting one invalidates old checks. */
export function qaInputKey(data: Pick<AppData, "items" | "qa">) {
  return JSON.stringify({
    requirements: data.qa?.requirements || [],
    items: data.items.map(item => ({
      document: item.document || null,
      source: item.fileSource || "",
      type: item.fileType || "",
      description: item.description,
      documentNumber: item.documentNumber,
    })),
  })
}

export function qaDocuments(items: TransmittalItem[]): DocumentReference[] {
  const references = items.map(item => item.document || {
    id: `item:${item.id}`, name: item.fileSource || item.description || "Untitled item",
    mimeType: "", revision: "unavailable",
  })
  return Array.from(new Map(references.map(doc => [doc.id, doc])).values())
}

export function aggregateQa(requirements: QaRequirement[], documents: QaDocumentResult[]): QaRow[] {
  return requirements.map(requirement => {
    const candidates = documents.flatMap(document => document.findings
      .filter(finding => finding.requirementId === requirement.id && finding.filename !== "no-match")
      .map(finding => ({ document, finding })))
    const unknown = documents.some(doc => doc.error || ["unavailable", "incomplete"].includes(doc.coverage))
    let status: QaStatus
    let explanation: string
    if (candidates.length > 1 || candidates.some(c => c.finding.filename === "uncertain")) {
      status = "Needs review"; explanation = "The filename match is uncertain or more than one document could satisfy this requirement."
    } else if (!candidates.length) {
      status = unknown ? "Unable to check" : "Missing file"
      explanation = unknown ? "Some documents could not be checked. Reattach or retry before deciding this file is missing." : "No uploaded filename matched this requirement."
    } else {
      const { document, finding } = candidates[0]
      const completeKeywords = requirement.keywords.every(keyword => finding.keywords.some(k => k.keyword === keyword))
      if (document.error || ["unavailable", "incomplete"].includes(document.coverage)) {
        status = "Unable to check"; explanation = document.error || "The complete document could not be checked."
      } else if (unknown || document.coverage === "visual" || !completeKeywords || finding.keywords.some(k => k.status === "uncertain")) {
        status = "Needs review"; explanation = "Review uncertain evidence or unreadable documents before accepting this match."
      } else if (finding.keywords.some(k => k.status === "missing")) {
        status = "Missing keywords"; explanation = "The matched document does not contain all required phrases."
      } else {
        status = "Passed"; explanation = "The filename matches and this document satisfies all required phrases."
      }
    }
    return { requirement, status, candidates, explanation }
  })
}
