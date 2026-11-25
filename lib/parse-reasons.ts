import { ApiError } from "./api-client"

/** Stable, non-sensitive reasons for an import or QA read that was not fully reliable. */
export const PARSE_REASONS = [
  "scan_unreadable",
  "extraction_failed",
  "provider_timeout",
  "provider_limit",
  "provider_rejected",
  "invalid_model",
  "config_missing",
  "config_unusable",
  "invalid_output",
  "too_large",
  "ocr_timeout",
  "ocr_unavailable",
  "document_number_unresolved",
] as const

export type ParseReason = (typeof PARSE_REASONS)[number]
/** How the row's content was obtained: document text, local OCR, AI visual reading, or nothing. */
export type ReadMethod = "text" | "ocr" | "visual" | "none"
export type KeyClass = "user" | "system" | "none"
export type PersonalKeyStatus = "none" | "usable" | "unusable"
export type ImportFlow = "upload" | "drive-selection" | "drive-folder" | "drive-link"
export const IMPORT_FLOWS: readonly ImportFlow[] = ["upload", "drive-selection", "drive-folder", "drive-link"]

const COPY: Record<ParseReason, string> = {
  scan_unreadable: "No readable text was found (scanned or image-only).",
  extraction_failed: "The document text could not be read.",
  provider_timeout: "The document took too long to analyze.",
  provider_limit: "The AI service limit was reached (file size or quota).",
  provider_rejected: "The AI service failed or rejected the request.",
  invalid_model: "The selected AI model is not available.",
  config_missing: "AI is not configured (no API key).",
  config_unusable: "Your saved personal AI key could not be used.",
  invalid_output: "The AI returned an unusable result.",
  too_large: "The file is too large to read visually.",
  ocr_timeout: "Local OCR ran out of time.",
  ocr_unavailable: "Local OCR is unavailable.",
  document_number_unresolved: "No document number was found in the document.",
}

const RECOVERY: Record<ParseReason, string> = {
  scan_unreadable: "Attach a text PDF or enter the details manually.",
  extraction_failed: "Retry, or attach a different copy of the file.",
  provider_timeout: "Retry later or split the file.",
  provider_limit: "Retry later, or attach a smaller file.",
  provider_rejected: "Retry, or check your AI key in account settings.",
  invalid_model: "Choose another model in account settings.",
  config_missing: "Add an AI key in account settings.",
  config_unusable: "Re-enter your AI key in account settings.",
  invalid_output: "Retry this file.",
  too_large: "Split the file or attach a text PDF.",
  ocr_timeout: "Retry, or attach a text PDF.",
  ocr_unavailable: "Check the details against the document.",
  document_number_unresolved: "Enter the document number manually.",
}

export const isParseReason = (value: unknown): value is ParseReason =>
  typeof value === "string" && (PARSE_REASONS as readonly string[]).includes(value)

export const reasonCopy = (reason: ParseReason) => COPY[reason]
export const reasonRecovery = (reason: ParseReason) => RECOVERY[reason]

/** Client-side error that already knows its reason, e.g. the 90 s request abort. */
export class ParseRequestError extends Error {
  readonly reason: ParseReason
  constructor(message: string, reason: ParseReason) {
    super(message)
    this.name = "ParseRequestError"
    this.reason = reason
  }
}

const statusOf = (error: unknown): number | undefined => {
  const value = (error as { status?: unknown; code?: unknown } | null)?.status ??
    (error as { code?: unknown } | null)?.code
  return typeof value === "number" ? value : undefined
}

/**
 * Maps a Gemini SDK or parsing error to exactly one reason. Status codes win over
 * message patterns; the message itself is never returned to the client.
 */
export function classifyProviderError(error: unknown): ParseReason {
  if (error instanceof SyntaxError) return "invalid_output"
  const status = statusOf(error)
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (status === 408 || status === 504 || /timeout|timed out|abort|deadline/i.test(message)) return "provider_timeout"
  if (status === 413 || /payload|too large|request entity|exceeds the (?:limit|maximum)|token count|input token/i.test(message)) return "provider_limit"
  if (status === 429 || /\b429\b|quota|rate limit|resource.?exhausted/i.test(message)) return "provider_limit"
  if (status === 404 || /model.*not found|not found.*model|unsupported model|invalid model/i.test(message)) return "invalid_model"
  if (status === 401 || status === 403 || /api key|permission|unauthori[sz]ed|forbidden|\b40[13]\b/i.test(message)) return "provider_rejected"
  if (/invalid data structure|without a usable|json/i.test(message)) return "invalid_output"
  return "provider_rejected"
}

/** Reason for an error thrown by the client parse request. */
export function reasonFromClientError(error: unknown): ParseReason {
  if (error instanceof ParseRequestError) return error.reason
  if (error instanceof ApiError) {
    const reason = (error.details as { reason?: unknown } | null)?.reason
    if (isParseReason(reason)) return reason
    if (error.status === 413) return "too_large"
    if (error.status === 0) return "extraction_failed"
    return "provider_rejected"
  }
  return "extraction_failed"
}

/** Short status-line note for a row that needs review. */
export function reviewNote(readMethod: ReadMethod | undefined, reason?: ParseReason) {
  if (readMethod === "none") return `${reason ? reasonCopy(reason) : "The document could not be read."} Filled from the file name`
  if (readMethod === "ocr") return reason ? `scanned, read with local OCR — ${reasonCopy(reason)}` : "scanned, read with local OCR"
  if (readMethod === "visual") return reason ? `read visually by AI — ${reasonCopy(reason)}` : "read visually by AI"
  return reason ? reasonCopy(reason) : ""
}

/** Key class actually used for a request; never the key itself. */
export const keyClassFor = (userKey: string | null | undefined, systemKey: string | null | undefined): KeyClass =>
  userKey ? "user" : systemKey ? "system" : "none"

export const needsReview = (readMethod: ReadMethod | undefined, reason?: ParseReason) =>
  Boolean(reason) || (readMethod !== undefined && readMethod !== "text")
