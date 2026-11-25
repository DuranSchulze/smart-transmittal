import { NextResponse } from "next/server"
import { ParseTransmittalRequestSchema } from "@/lib/validation"
import {
  buildFailureParseResult,
  extractLabeledIdentifier,
  getSystemGeminiApiKey,
  parseTransmittalDocument,
  type ParseResult,
} from "@/services/geminiService"
import { auth } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { getUserGeminiModel, resolveUserGeminiKey } from "@/server/user-ai-settings"
import { validateBody } from "@/server/validation"
import { parseDocumentText } from "@/server/local-document-parser"
import { extractLaterPagesText, preparePdfForParsing } from "@/server/pdf-parsing"
import { withRouteMetrics } from "@/server/observability"
import { isImageDocument } from "@/lib/import-file-policy"
import { IMPORT_FLOWS, keyClassFor, type ImportFlow, type KeyClass, type PersonalKeyStatus } from "@/lib/parse-reasons"

export const runtime = "nodejs"
export const maxDuration = 120

const MAX_CONTENT_LENGTH = 25 * 1024 * 1024
// Gemini's inline request ceiling (spec A2); configurable until verified per model.
const DEFAULT_INLINE_MAX_BYTES = 20 * 1024 * 1024
const MAX_VISUAL_PAGES = 1000
// The client aborts at 90 s; leave headroom for the response.
const CLIENT_BUDGET_MS = 85_000
const MIN_PROVIDER_MS = 20_000
const MAX_PROVIDER_MS = 60_000

const inlineMaxBytes = () => {
  const value = Number(process.env.GEMINI_INLINE_MAX_BYTES)
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_INLINE_MAX_BYTES
}
const decodedBytes = (base64: string) => Math.floor((base64.length * 3) / 4)

async function postHandler(request: Request) {
  const requestStartedAt = performance.now()
  try {
    const authStartedAt = performance.now()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const authMs = performance.now() - authStartedAt
    const validation = await validateBody(
      request,
      ParseTransmittalRequestSchema,
    )
    if ("response" in validation) return validation.response

    const { content, mimeType, isText, fileName } = validation.data
    const rawFlow = (validation.data as { flow?: unknown }).flow
    const flow = IMPORT_FLOWS.includes(rawFlow as ImportFlow) ? rawFlow as ImportFlow : undefined
    if (isImageDocument(mimeType, fileName)) {
      return NextResponse.json({ error: "Image imports are not supported. Use a PDF or Word document." }, { status: 415 })
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "File content is too large to analyze.", reason: "too_large" },
        { status: 413 },
      )
    }

    const extractStartedAt = performance.now()
    const prepared = await preparePdfForParsing(content, mimeType, isText)
    let result: ParseResult | null = prepared.extractedPdfText ? parseDocumentText(prepared.content) : null
    const extractMs = performance.now() - extractStartedAt
    let settingsMs = 0
    let keyClass: KeyClass | undefined
    let personalKeyStatus: PersonalKeyStatus | undefined
    const parseStartedAt = performance.now()
    const visualPdf = !prepared.isText && prepared.mimeType === "application/pdf"
    if (!result && visualPdf && (decodedBytes(prepared.content) > inlineMaxBytes() || (prepared.pageCount ?? 0) > MAX_VISUAL_PAGES)) {
      // REQ-6: refuse before the provider call instead of waiting for its rejection.
      result = buildFailureParseResult(fileName, "too_large")
    }
    if (!result) {
      const settingsStartedAt = performance.now()
      const [userKey, userGeminiModel] = await Promise.all([
        resolveUserGeminiKey(session.user.id),
        getUserGeminiModel(session.user.id),
      ])
      settingsMs = performance.now() - settingsStartedAt
      keyClass = keyClassFor(userKey.apiKey, getSystemGeminiApiKey())
      personalKeyStatus = userKey.personalKeyStatus
      const spentMs = performance.now() - requestStartedAt
      const timeoutMs = Math.round(Math.min(MAX_PROVIDER_MS, Math.max(MIN_PROVIDER_MS, CLIENT_BUDGET_MS - spentMs)))
      result = await parseTransmittalDocument(
        prepared.content,
        prepared.mimeType,
        prepared.isText,
        fileName,
        userKey.apiKey || undefined,
        prepared.extractedPdfText || Boolean(fileName && isText),
        userGeminiModel || undefined,
        { timeoutMs },
      )
    }

    // J3: a text PDF whose identifier is not on the cover gets one bounded later-page check.
    if (
      result.parser !== "fallback" && prepared.extractedPdfText && (result.fallbackCount || 0) > 0 &&
      (prepared.pageCount ?? 0) > 1 && result.items.length === 1
    ) {
      const identifier = extractLabeledIdentifier(await extractLaterPagesText(content))
      if (identifier) {
        result = { ...result, items: [{ ...result.items[0], documentNumber: identifier }], fallbackCount: undefined }
      } else {
        result = { ...result, reason: result.reason || "document_number_unresolved" }
      }
    }

    const readMethod = result.parser === "fallback" ? "none" : prepared.readMethod || result.readMethod || (prepared.isText ? "text" : "visual")
    // Explain why a row was read visually or by OCR even when the AI succeeded.
    const reason = result.reason || (readMethod !== "text" ? prepared.reason : undefined)
    const body: ParseResult = {
      ...result,
      readMethod,
      ...(reason ? { reason } : {}),
      ...(keyClass ? { keyClass } : {}),
      ...(personalKeyStatus === "unusable" ? { personalKeyStatus } : {}),
    }
    const parseMs = performance.now() - parseStartedAt
    // Log timings and outcome only; never document contents, file names, or API keys.
    console.info(JSON.stringify({
      event: "document_parse_complete",
      flow,
      authMs: Math.round(authMs),
      settingsMs: Math.round(settingsMs),
      parseMs: Math.round(parseMs),
      extractMs: Math.round(extractMs),
      extractedPdfText: prepared.extractedPdfText,
      parser: body.parser || "gemini",
      readMethod,
      reason,
      keyClass,
      personalKeyStatus,
      pageCount: prepared.pageCount,
      ocrPages: prepared.ocrPages,
      ocrMs: prepared.ocrMs,
      contentLength: content.length,
      usedFallback: Boolean(body.error || body.fallbackCount),
    }))
    return NextResponse.json(body, { headers: {
      "Server-Timing": `auth;dur=${authMs.toFixed(1)}, settings;dur=${settingsMs.toFixed(1)}, extract;dur=${extractMs.toFixed(1)}, parse;dur=${parseMs.toFixed(1)}`,
    } })
  } catch (error) {
    return routeErrorResponse(error, "Parse transmittal error")
  }
}

export const POST = withRouteMetrics("/api/parse-transmittal", postHandler)
