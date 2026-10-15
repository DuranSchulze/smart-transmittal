import type { SenderInfo } from "../types"

export const MAX_LOGO_BYTES = 2 * 1024 * 1024
export const LOGO_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/

/** Inline image data is used only for a pending upload or a legacy record. */
export function getAgencyLogo(source: Pick<SenderInfo, "logoUrl" | "logoBase64">): string | null {
  return source.logoUrl || source.logoBase64 || null
}
