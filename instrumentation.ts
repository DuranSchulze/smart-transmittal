import { PrismaInstrumentation } from "@prisma/instrumentation"
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base"
import { registerOTel } from "@vercel/otel"

export function register() {
  registerOTel({
    serviceName: "smart-transmittal",
    instrumentations: [new PrismaInstrumentation()],
    traceSampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(
        process.env.NODE_ENV === "production" ? 0.1 : 1,
      ),
    }),
  })
}
