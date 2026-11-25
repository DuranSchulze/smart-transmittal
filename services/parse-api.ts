import type { ParseResult } from "./geminiService"
import type { ParseTransmittalInput } from "../lib/validation"
import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "./api-url"
import { ParseRequestError, reasonCopy } from "../lib/parse-reasons"

export async function parseDocument(
  input: ParseTransmittalInput,
  baseUrl?: string,
): Promise<ParseResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90_000)
  try {
    return await apiFetch<ParseResult>(
      resolveApiUrl("/api/parse-transmittal", baseUrl),
      apiJsonOptions("POST", input, { signal: controller.signal }),
    )
  } catch (error) {
    if (controller.signal.aborted) {
      // REQ-6: "took too long" is distinct from "the AI service failed".
      throw new ParseRequestError(`${reasonCopy("provider_timeout")} Retry later or split the file.`, "provider_timeout")
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
