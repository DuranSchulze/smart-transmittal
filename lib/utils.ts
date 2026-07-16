import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const TRANSMITTAL_PREFIX = "TR-FP-"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ensureTransmittalPrefix(value: string): string {
  const trimmed = String(value || "").trim()
  if (!trimmed) return ""
  return trimmed.startsWith(TRANSMITTAL_PREFIX)
    ? trimmed
    : `${TRANSMITTAL_PREFIX}${trimmed}`
}

export function stripTransmittalPrefix(value: string): string {
  const trimmed = String(value || "").trim()
  return trimmed.startsWith(TRANSMITTAL_PREFIX)
    ? trimmed.slice(TRANSMITTAL_PREFIX.length)
    : trimmed
}

export function normalizeTransmittalNumber(value: string): string {
  return stripTransmittalPrefix(value).toUpperCase()
}
