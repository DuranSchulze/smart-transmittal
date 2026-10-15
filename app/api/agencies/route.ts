import { NextResponse } from "next/server"
import { AgencyRequestSchema } from "@/lib/validation"
import { auth, db } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { validateBody } from "@/server/validation"
import { prepareAgencyLogo } from "@/server/imagekit"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 60

async function getHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const agencies = await db.agency.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    })
    return NextResponse.json({ agencies: agencies.map(({ userId, ...agency }) => ({
      ...agency, canManage: userId === session.user.id,
    })) })
  } catch (error) {
    return routeErrorResponse(error, "Load agencies error")
  }
}

async function postHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const validation = await validateBody(request, AgencyRequestSchema)
    if ("response" in validation) return validation.response
    const agency = validation.data.agency

    const logo = await prepareAgencyLogo(agency)
    const agencyData = {
      name: agency.name,
      addressLine1: agency.addressLine1 || null,
      addressLine2: agency.addressLine2 || null,
      website: agency.website || null,
      telephoneNumber: agency.telephoneNumber || null,
      contactNumber: agency.contactNumber || null,
      email: agency.email || null,
      ...logo,
    }

    const saved = await db.agency.create({
      data: { userId: session.user.id, ...agencyData },
    })
    const { userId, ...record } = saved
    return NextResponse.json({ agency: { ...record, canManage: true } }, { status: 201 })
  } catch (error) {
    return routeErrorResponse(error, "Create agency error")
  }
}

export const GET = withRouteMetrics("/api/agencies", getHandler)
export const POST = withRouteMetrics("/api/agencies", postHandler)
