import { NextResponse } from "next/server"
import { ParseTransmittalRequestSchema } from "@/lib/validation"
import { parseTransmittalDocument } from "@/services/geminiService"
import { auth } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { getDecryptedUserGeminiApiKey } from "@/server/user-ai-settings"
import { validateBody } from "@/server/validation"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 120

const MAX_CONTENT_LENGTH = 25 * 1024 * 1024

async function postHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const validation = await validateBody(
      request,
      ParseTransmittalRequestSchema,
    )
    if ("response" in validation) return validation.response

    const { content, mimeType, isText, fileName } = validation.data
    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "File content is too large to analyze." },
        { status: 413 },
      )
    }

    const userGeminiApiKey =
      (await getDecryptedUserGeminiApiKey(session.user.id)) || undefined
    const result = await parseTransmittalDocument(
      content,
      mimeType,
      isText,
      fileName,
      userGeminiApiKey,
    )
    return NextResponse.json(result)
  } catch (error) {
    return routeErrorResponse(error, "Parse transmittal error")
  }
}

export const POST = withRouteMetrics("/api/parse-transmittal", postHandler)
