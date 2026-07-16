import { AsyncLocalStorage } from "node:async_hooks"
import { trace } from "@opentelemetry/api"

type RouteMetrics = {
  route: string
  method: string
  startedAt: number
  databaseQueryCount: number
  databaseTimeMs: number
}

const routeMetrics = new AsyncLocalStorage<RouteMetrics>()
const tracer = trace.getTracer("smart-transmittal.routes")

const SUCCESS_SAMPLE_RATE = 0.1
const SLOW_REQUEST_MS = 1_000

export async function observeDatabaseQuery<T>(operation: () => Promise<T>) {
  const metrics = routeMetrics.getStore()
  const startedAt = performance.now()
  try {
    return await operation()
  } finally {
    if (metrics) {
      metrics.databaseQueryCount += 1
      metrics.databaseTimeMs += performance.now() - startedAt
    }
  }
}

async function responseSize(response: Response) {
  const contentLength = response.headers.get("content-length")
  if (contentLength && /^\d+$/.test(contentLength)) return Number(contentLength)

  try {
    return (await response.clone().arrayBuffer()).byteLength
  } catch {
    return null
  }
}

export function withRouteMetrics(
  route: string,
  handler: (request: Request, context?: unknown) => Promise<Response>,
) {
  return async (request: Request, context?: unknown) => {
    const metrics: RouteMetrics = {
      route,
      method: request.method,
      startedAt: performance.now(),
      databaseQueryCount: 0,
      databaseTimeMs: 0,
    }

    return routeMetrics.run(metrics, () =>
      tracer.startActiveSpan(`${request.method} ${route}`, async (span) => {
        try {
          const response = await handler(request, context)
          const durationMs = performance.now() - metrics.startedAt
          const shouldLog =
            response.status >= 500 ||
            durationMs >= SLOW_REQUEST_MS ||
            Math.random() < SUCCESS_SAMPLE_RATE

          span.setAttributes({
            "http.route": route,
            "http.response.status_code": response.status,
            "app.database.query_count": metrics.databaseQueryCount,
            "app.database.time_ms": metrics.databaseTimeMs,
          })
          if (response.status >= 500) span.setStatus({ code: 2 })

          if (shouldLog) {
            const responseBytes = await responseSize(response)
            console.info(
              JSON.stringify({
                event: "api_request_complete",
                route: metrics.route,
                method: metrics.method,
                status: response.status,
                durationMs: Math.round(durationMs * 100) / 100,
                databaseQueryCount: metrics.databaseQueryCount,
                databaseTimeMs: Math.round(metrics.databaseTimeMs * 100) / 100,
                responseBytes,
              }),
            )
          }

          response.headers.append(
            "Server-Timing",
            `total;dur=${durationMs.toFixed(1)}, db;dur=${metrics.databaseTimeMs.toFixed(1)}`,
          )
          return response
        } catch (error) {
          span.recordException(error instanceof Error ? error : String(error))
          span.setStatus({ code: 2 })
          throw error
        } finally {
          span.end()
        }
      }),
    )
  }
}
