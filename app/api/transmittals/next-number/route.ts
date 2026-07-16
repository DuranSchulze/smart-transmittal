import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { generateNextNumber } from "@/server/transmittal-service";
import { withRouteMetrics } from "@/server/observability";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * Generate the next unique transmittal number for the current month.
 * Format: YYYYMM-XXXX (e.g. 202601-0001)
 * The DB stores it with the TR-FP- prefix, but the API returns it without.
 */
async function getHandler(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers as any,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      transmittalNumber: await generateNextNumber(),
    });
  } catch (error: any) {
    console.error("Generate next transmittal number error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withRouteMetrics(
  "/api/transmittals/next-number",
  getHandler,
);
