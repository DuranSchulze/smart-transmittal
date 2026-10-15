import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { getDecryptedUserGeminiApiKey } from "@/server/user-ai-settings"
import { listAvailableGeminiModels } from "@/server/gemini-models"
import { getSystemGeminiApiKey } from "@/services/geminiService"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 20

async function getHandler(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers as any,
    })
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const personalKey = await getDecryptedUserGeminiApiKey(session.user.id)
    const systemKey = getSystemGeminiApiKey()
    const apiKey = personalKey || systemKey
    const source = personalKey ? "personal" : systemKey ? "system" : "none"

    if (!apiKey) {
      return NextResponse.json({
        models: [],
        source,
        warning: "No Gemini API key is configured yet.",
      })
    }

    try {
      const models = await listAvailableGeminiModels(apiKey)
      return NextResponse.json({ models, source })
    } catch (error: any) {
      console.warn("List Gemini models failed:", error?.message || error)
      return NextResponse.json(
        {
          models: [],
          source,
          error: "Could not load models from the Gemini API.",
        },
        { status: 502 },
      )
    }
  } catch (error: any) {
    console.error("Gemini models route error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const GET = withRouteMetrics("/api/gemini-models", getHandler)
