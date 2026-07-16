import { NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import {
  createTransmittal,
  listTransmittalSummaries,
} from "@/server/transmittal-service"
import { validateBody } from "@/server/validation"
import { TransmittalSaveRequestSchema } from "@/lib/validation"
import type { AppData } from "@/types"
import { withRouteMetrics } from "@/server/observability"
import { OPEN_ALL_TRANSMITTALS_ENABLED } from "@/lib/features"

export const runtime = "nodejs"
export const maxDuration = 15

async function getHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const searchParams = new URL(request.url).searchParams
    const scope = searchParams.get("scope")
    if (scope === "all" && !OPEN_ALL_TRANSMITTALS_ENABLED) {
      return NextResponse.json(
        { error: "Open All transmittals is temporarily unavailable." },
        { status: 403 },
      )
    }

    if (scope === "all" || scope === "mine") {
      const requestedPageSize = Number(searchParams.get("pageSize") || 12)
      const requestedPage = Number(searchParams.get("page") || 1)
      const status = searchParams.get("status")
      const sort = searchParams.get("sort")
      const allowedSorts = new Set([
        "updated-desc",
        "created-desc",
        "project-asc",
        "number-asc",
        "owner-asc",
      ])

      return NextResponse.json(
        await listTransmittalSummaries(session.user.id, scope, {
          page: Number.isFinite(requestedPage) ? requestedPage : 1,
          pageSize: Number.isFinite(requestedPageSize) ? requestedPageSize : 12,
          search: searchParams.get("search") || undefined,
          date: searchParams.get("date") || undefined,
          status:
            status === "draft" || status === "final" ? status : "all",
          owner: scope === "all" ? searchParams.get("owner") || undefined : undefined,
          sort: allowedSorts.has(sort || "")
            ? (sort as
                | "updated-desc"
                | "created-desc"
                | "project-asc"
                | "number-asc"
                | "owner-asc")
            : "updated-desc",
        }),
      )
    }

    return NextResponse.json(
      { error: 'The "scope" query parameter must be "mine" or "all".' },
      { status: 400 },
    )
  } catch (error) {
    return routeErrorResponse(error, "Load transmittals error")
  }
}

async function postHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const validation = await validateBody(
      request,
      TransmittalSaveRequestSchema,
    )
    if ("response" in validation) return validation.response

    const transmittal = await createTransmittal(
      session.user.id,
      validation.data.data as AppData,
      validation.data.isDraft,
    )
    return NextResponse.json({ transmittal })
  } catch (error) {
    return routeErrorResponse(error, "Save transmittal error")
  }
}

export const GET = withRouteMetrics("/api/transmittals", getHandler)
export const POST = withRouteMetrics("/api/transmittals", postHandler)
