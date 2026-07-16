import { NextRequest, NextResponse } from "next/server"
import { AgencyRequestSchema } from "@/lib/validation"
import { auth, db } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { ServiceError } from "@/server/service-error"
import { validateBody } from "@/server/validation"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 15

type RouteContext = { params: Promise<{ id: string }> }

async function putHandler(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const validation = await validateBody(request, AgencyRequestSchema)
    if ("response" in validation) return validation.response
    const { id } = await context.params

    const existing = await db.agency.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    if (!existing) throw new ServiceError(404, "Agency not found")

    const agency = validation.data.agency
    const updated = await db.agency.update({
      where: { id },
      data: {
        name: agency.name,
        addressLine1: agency.addressLine1 || null,
        addressLine2: agency.addressLine2 || null,
        website: agency.website || null,
        telephoneNumber: agency.telephoneNumber || null,
        contactNumber: agency.contactNumber || null,
        email: agency.email || null,
        logoBase64: agency.logoBase64 || null,
      },
    })
    return NextResponse.json({ agency: updated })
  } catch (error) {
    return routeErrorResponse(error, "Update agency error")
  }
}

async function deleteHandler(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await context.params
    const existing = await db.agency.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    if (!existing) throw new ServiceError(404, "Agency not found")

    await db.agency.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return routeErrorResponse(error, "Delete agency error")
  }
}

export const PUT = withRouteMetrics(
  "/api/agencies/[id]",
  (request, context) => putHandler(request as NextRequest, context as RouteContext),
)
export const DELETE = withRouteMetrics(
  "/api/agencies/[id]",
  (request, context) => deleteHandler(request as NextRequest, context as RouteContext),
)
