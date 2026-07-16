import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { withRouteMetrics } from "@/server/observability";

export const runtime = "nodejs";
export const maxDuration = 30;

const handler = toNextJsHandler(auth);

export const GET = withRouteMetrics(
  "/api/auth/[...all]",
  (request) => handler.GET(request),
);
export const POST = withRouteMetrics(
  "/api/auth/[...all]",
  (request) => handler.POST(request),
);
export const PUT = withRouteMetrics(
  "/api/auth/[...all]",
  (request) => handler.PUT(request),
);
export const PATCH = withRouteMetrics(
  "/api/auth/[...all]",
  (request) => handler.PATCH(request),
);
export const DELETE = withRouteMetrics(
  "/api/auth/[...all]",
  (request) => handler.DELETE(request),
);
