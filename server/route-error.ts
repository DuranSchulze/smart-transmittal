import { NextResponse } from "next/server"
import { ServiceError, isUniqueConstraintError } from "./service-error"

export function routeErrorResponse(error: unknown, context: string) {
  console.error(`${context}:`, error)

  if (error instanceof ServiceError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    )
  }

  if (isUniqueConstraintError(error)) {
    return NextResponse.json(
      { error: "A record with that value already exists." },
      { status: 409 },
    )
  }

  return NextResponse.json(
    { error: "An internal server error occurred." },
    { status: 500 },
  )
}
