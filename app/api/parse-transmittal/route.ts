import { NextResponse } from "next/server"
import { ParseTransmittalRequestSchema } from "@/lib/validation"
import { parseTransmittalDocument } from "@/services/geminiService"
import { auth } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { getDecryptedUserGeminiApiKey, getUserGeminiModel } from "@/server/user-ai-settings"
import { validateBody } from "@/server/validation"
import { parseDocumentText } from "@/server/local-document-parser"
import { preparePdfForParsing } from "@/server/pdf-parsing"
import { withRouteMetrics } from "@/server/observability"
import { isImageDocument } from "@/lib/import-file-policy"

export const runtime = "nodejs"
export const maxDuration = 120

const MAX_CONTENT_LENGTH = 25 * 1024 * 1024

async function postHandler(request: Request) {
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
    if (isImageDocument(mimeType, fileName)) {
      return NextResponse.json({ error: "Image imports are not supported. Use a PDF or Word document." }, { status: 415 })
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "File content is too large to analyze." },
        { status: 413 },
      )
    }

    const extractStartedAt = performance.now()
    const prepared = await preparePdfForParsing(content, mimeType, isText)
    const localResult = prepared.extractedPdfText ? parseDocumentText(prepared.content) : null
    const extractMs = performance.now() - extractStartedAt
    let settingsMs = 0
    const parseStartedAt = performance.now()
    let result = localResult
    if (!result) {
      const settingsStartedAt = performance.now()
      const [userGeminiApiKey, userGeminiModel] = await Promise.all([
        getDecryptedUserGeminiApiKey(session.user.id),
        getUserGeminiModel(session.user.id),
      ])
      settingsMs = performance.now() - settingsStartedAt
      result = await parseTransmittalDocument(
        prepared.content,
        prepared.mimeType,
        prepared.isText,
        fileName,
        userGeminiApiKey || undefined,
        prepared.extractedPdfText || Boolean(fileName && isText),
        userGeminiModel || undefined,
      )
    }
    const parseMs = performance.now() - parseStartedAt
    // Log timings and outcome only; never document contents or API keys.
    console.info(JSON.stringify({
      event: "document_parse_complete",
      authMs: Math.round(authMs),
      settingsMs: Math.round(settingsMs),
      parseMs: Math.round(parseMs),
      extractMs: Math.round(extractMs),
      extractedPdfText: prepared.extractedPdfText,
      parser: result.parser || "gemini",
      contentLength: content.length,
      usedFallback: Boolean(result.error || result.fallbackCount),
    }))
    return NextResponse.json(result, { headers: {
      "Server-Timing": `auth;dur=${authMs.toFixed(1)}, settings;dur=${settingsMs.toFixed(1)}, extract;dur=${extractMs.toFixed(1)}, parse;dur=${parseMs.toFixed(1)}`,
    } })
  } catch (error) {
    return routeErrorResponse(error, "Parse transmittal error")
  }
}

export const POST = withRouteMetrics("/api/parse-transmittal", postHandler)
