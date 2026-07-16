import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import {
  deleteTransmittal,
  getTransmittalById,
  patchTransmittal,
  updateTransmittal,
} from "@/server/transmittal-service"
import { withRouteMetrics } from "@/server/observability"
import { validateBody } from "@/server/validation"
import {
  TransmittalPatchRequestSchema,
  TransmittalSaveRequestSchema,
} from "@/lib/validation"
import type { AppData } from "@/types"

export const runtime = "nodejs"
export const maxDuration = 15

type RouteContext = { params: Promise<{ id: string }> }

const getHandler = async (request: Request, routeContext?: unknown) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const context = routeContext as RouteContext
    const { id } = await context.params
    return NextResponse.json(await getTransmittalById(id, session.user.id))
  } catch (error) {
    return routeErrorResponse(error, "Load transmittal error")
  }
}

export const GET = withRouteMetrics("/api/transmittals/[id]", getHandler)

async function patchHandler(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const validation = await validateBody(
      request,
      TransmittalPatchRequestSchema,
    )
    if ("response" in validation) return validation.response

    const { id } = await context.params
    return NextResponse.json(
      await patchTransmittal(id, session.user.id, validation.data),
    )
  } catch (error) {
    return routeErrorResponse(error, "Rename transmittal error")
  }
}

async function putHandler(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params
    const result = await updateTransmittal(
      id,
      session.user.id,
      validation.data.data as AppData,
      validation.data.isDraft,
    )
    return NextResponse.json(result)
  } catch (error) {
    return routeErrorResponse(error, "Update transmittal error")
  }
}

async function deleteHandler(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await context.params
    await deleteTransmittal(id, session.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Delete transmittal error")
  }
}

export const PATCH = withRouteMetrics(
  "/api/transmittals/[id]",
  (request, context) => patchHandler(request as NextRequest, context as RouteContext),
)
export const PUT = withRouteMetrics(
  "/api/transmittals/[id]",
  (request, context) => putHandler(request as NextRequest, context as RouteContext),
)
export const DELETE = withRouteMetrics(
  "/api/transmittals/[id]",
  (request, context) => deleteHandler(request as NextRequest, context as RouteContext),
)
