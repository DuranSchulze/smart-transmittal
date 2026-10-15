import { getAgencyLogo, MAX_LOGO_BYTES } from "../lib/agency-logo"
import type { SenderInfo } from "../types"

/** Word embeds image bytes; remote URLs must be downloaded before packaging. */
export async function loadLogoBytes(sender: SenderInfo): Promise<Uint8Array | null> {
  const source = getAgencyLogo(sender)
  if (!source) return null
  if (source.startsWith("data:image/")) {
    const decoded = atob(source.split(",")[1])
    return Uint8Array.from(decoded, character => character.charCodeAt(0))
  }
  const url = new URL(source)
  if (url.protocol !== "https:") throw new Error("Company logo must use an HTTPS URL.")
  // DOCX 8 embeds images as PNG. ImageKit can deliver all accepted logo formats
  // as PNG without changing the original URL stored in the database.
  url.searchParams.set("tr", [url.searchParams.get("tr"), "f-png", "lo-true"].filter(Boolean).join(","))
  let response: Response
  try {
    response = await fetch(url.href, { credentials: "omit", signal: AbortSignal.timeout(15_000) })
  } catch { throw new Error("Could not load the company logo for export. Check your connection and retry.") }
  if (!response.ok) throw new Error("Could not load the company logo for export. Please retry.")
  const type = response.headers.get("content-type")?.split(";")[0] || ""
  if (!/^image\/(png|jpeg|gif|webp)$/.test(type)) throw new Error("Company logo URL did not return a supported image.")
  if (Number(response.headers.get("content-length")) > MAX_LOGO_BYTES) throw new Error("Company logo is too large to export.")
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) throw new Error("Company logo is empty or too large to export.")
  return bytes
}
