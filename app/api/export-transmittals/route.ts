import { NextRequest, NextResponse } from "next/server"
import { db } from "@/server/auth"
import { withRouteMetrics } from "@/server/observability"

export const runtime = "nodejs"
export const maxDuration = 30

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{10,64}$/

const stripTransmittalPrefix = (value: string) =>
  value.startsWith("TR-FP-") ? value.slice("TR-FP-".length) : value

const exportHandler = async (request: Request) => {
  try {
    const apiToken = process.env.SEND_API_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { error: "SEND_API_TOKEN not configured" },
        { status: 500 },
      )
    }

    if (request.headers.get("x-api-token") !== apiToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawLimit = searchParams.get("limit")
    const limit = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return NextResponse.json(
        { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
        { status: 400 },
      )
    }

    const cursor = searchParams.get("cursor")?.trim() || null
    if (cursor && !CURSOR_PATTERN.test(cursor)) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 })
    }

    const records = await db.transmittal.findMany({
      where: cursor ? { id: { gt: cursor } } : undefined,
      orderBy: { id: "asc" },
      take: limit + 1,
      select: {
        id: true,
        project: true,
        preparedBy: true,
        handDelivery: true,
        pickUp: true,
        courier: true,
        registeredMail: true,
        recipients: {
          take: 1,
          select: {
            recipientOrganization: true,
            recipientName: true,
          },
        },
        items: {
          select: {
            documentNumber: true,
            description: true,
            fileType: true,
            fileSource: true,
            remarks: true,
          },
        },
        user: { select: { name: true, email: true } },
      },
    })

    const hasMore = records.length > limit
    const page = hasMore ? records.slice(0, limit) : records
    const rows = page.flatMap((transmittal) => {
      const project =
        transmittal.project &&
        typeof transmittal.project === "object" &&
        !Array.isArray(transmittal.project)
          ? transmittal.project
          : {}
      const transmittalNumber = stripTransmittalPrefix(
        String(project.transmittalNumber || ""),
      )
      const date = String(project.date || "")
      const primaryRecipient = transmittal.recipients[0]
      const client =
        primaryRecipient?.recipientOrganization ||
        primaryRecipient?.recipientName ||
        ""
      const mode = [
        transmittal.handDelivery ? "Hand Delivery" : null,
        transmittal.pickUp ? "Pick Up" : null,
        transmittal.courier ? "Courier" : null,
        transmittal.registeredMail ? "Registered Mail" : null,
      ]
        .filter(Boolean)
        .join(", ")
      const transmittedBy =
        transmittal.preparedBy ||
        transmittal.user.name ||
        transmittal.user.email ||
        ""
      const items = transmittal.items.length ? transmittal.items : [null]

      return items.map((item) => ({
        client,
        documents: item
          ? [item.documentNumber, item.description].filter(Boolean).join(" - ")
          : "",
        transmittalDocumentNo: transmittalNumber,
        dateOfTransmittal: date,
        transmittedBy,
        mode,
        gdLink:
          item?.fileType === "gdrive" ? item.fileSource || "" : "",
        remarks: item?.remarks || "",
      }))
    })

    return NextResponse.json({
      rows,
      nextCursor: hasMore ? page.at(-1)?.id || null : null,
      hasMore,
      exportedTransmittals: page.length,
    })
  } catch (error) {
    console.error("Export transmittals error:", error)
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    )
  }
}

export const GET = withRouteMetrics(
  "/api/export-transmittals",
  exportHandler,
) as (request: NextRequest) => Promise<Response>
