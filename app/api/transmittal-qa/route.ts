import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { QaRequestSchema, MAX_QA_CONTENT } from "@/lib/transmittal-qa"
import { checkQaDocument } from "@/server/transmittal-qa"
import { getDecryptedUserGeminiApiKey, getUserGeminiModel, getSystemDefaultGeminiModel } from "@/server/user-ai-settings"
import { getSystemGeminiApiKey } from "@/services/geminiService"
import { ServiceError } from "@/server/service-error"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 120

async function postHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    // Enforce the encoded request limit before parsing; do not retain/log rejected content.
    const limit = MAX_QA_CONTENT + 200_000
    if (Number(request.headers.get("content-length")) > limit) return NextResponse.json({ error: "File content is too large to analyze." }, { status: 413 })
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: "Request body is required." }, { status: 400 })
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        return NextResponse.json({ error: "File content is too large to analyze." }, { status: 413 })
      }
      chunks.push(value)
    }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) }
    catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }) }
    const parsed = QaRequestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid QA document or checklist." }, { status: 400 })
    const [userKey, userModel] = await Promise.all([
      getDecryptedUserGeminiApiKey(session.user.id), getUserGeminiModel(session.user.id),
    ])
    return NextResponse.json(await checkQaDocument(parsed.data, userKey || getSystemGeminiApiKey(), userModel || getSystemDefaultGeminiModel()), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    // SDK errors can contain request payloads; never log them or return provider errors.
    return NextResponse.json({ error: error instanceof ServiceError ? error.message : "Could not check this document. Retry or check your AI settings." }, { status: error instanceof ServiceError ? error.status : 502 })
  }
}
export const POST = withRouteMetrics("/api/transmittal-qa", postHandler)
