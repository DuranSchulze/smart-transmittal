import type { ParseResult } from "./geminiService"
import type { ParseTransmittalInput } from "../lib/validation"
import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "./api-url"

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
      throw new Error("Document analysis timed out. Try a smaller file or retry later.")
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
