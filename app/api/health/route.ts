import { NextResponse } from "next/server";

export const maxDuration = 5;

export async function GET() {
  return NextResponse.json({ ok: true });
}
