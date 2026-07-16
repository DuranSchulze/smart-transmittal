import { NextResponse } from "next/server"
import { AgencyRequestSchema } from "@/lib/validation"
import { auth, db } from "@/server/auth"
import { routeErrorResponse } from "@/server/route-error"
import { validateBody } from "@/server/validation"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 15

async function getHandler(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const agencies = await db.agency.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    })
    return NextResponse.json({ agencies })
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

    const agencyData = {
      name: agency.name,
      addressLine1: agency.addressLine1 || null,
      addressLine2: agency.addressLine2 || null,
      website: agency.website || null,
      telephoneNumber: agency.telephoneNumber || null,
      contactNumber: agency.contactNumber || null,
      email: agency.email || null,
      logoBase64: agency.logoBase64 || null,
    }

    const upserted = await db.agency.upsert({
      where: {
        userId_name: { userId: session.user.id, name: agency.name },
      },
      create: { userId: session.user.id, ...agencyData },
      update: agencyData,
    })
    return NextResponse.json({ agency: upserted })
  } catch (error) {
    return routeErrorResponse(error, "Create agency error")
  }
}

export const GET = withRouteMetrics("/api/agencies", getHandler)
export const POST = withRouteMetrics("/api/agencies", postHandler)
