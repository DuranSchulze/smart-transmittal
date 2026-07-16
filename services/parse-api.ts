import type { ParseResult } from "./geminiService"
import type { ParseTransmittalInput } from "../lib/validation"
import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "./api-url"

export function parseDocument(
  input: ParseTransmittalInput,
  baseUrl?: string,
): Promise<ParseResult> {
  return apiFetch<ParseResult>(
    resolveApiUrl("/api/parse-transmittal", baseUrl),
    apiJsonOptions("POST", input),
  )
}
