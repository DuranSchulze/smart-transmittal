import { NextResponse } from "next/server"
import type { z } from "zod"

export type BodyValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse }

export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<BodyValidationResult<T>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      ),
    }
  }

  const result = schema.safeParse(body)
  if (result.success) return { success: true, data: result.data }

  return {
    success: false,
    response: NextResponse.json(
      {
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      },
      { status: 400 },
    ),
  }
}
