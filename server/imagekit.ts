import { createHash } from "node:crypto"
import { MAX_LOGO_BYTES, LOGO_DATA_URL_PATTERN } from "../lib/agency-logo"
import { ServiceError } from "./service-error"

export type UploadedLogo = { logoUrl: string; logoFileId: string }

export function imagekitConfig() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim()
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim().replace(/\/+$/, "")
  if (!privateKey || !urlEndpoint) throw new ServiceError(503, "Logo storage is not configured. Set the ImageKit server credentials.")
  const endpoint = new URL(urlEndpoint)
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new ServiceError(503, "ImageKit URL endpoint must be an HTTPS delivery URL.")
  }
  return { privateKey, urlEndpoint }
}

export function validateLogoUrl(value: string): string {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim().replace(/\/+$/, "")
  if (!endpoint) throw new ServiceError(503, "Logo storage is not configured.")
  try {
    const url = new URL(value)
    const base = new URL(endpoint)
    if (url.protocol !== "https:" || url.origin !== base.origin || url.username || url.password ||
        !url.pathname.startsWith(`${base.pathname.replace(/\/$/, "")}/`) || url.hash) throw new Error()
    return url.href
  } catch { throw new ServiceError(400, "Use a logo URL from this system's ImageKit storage.") }
}

/** Check bytes as well as the supplied MIME type before sending a logo to storage. */
export function decodeLogo(dataUrl: string) {
  if (!LOGO_DATA_URL_PATTERN.test(dataUrl)) throw new ServiceError(400, "Choose a PNG, JPG, WebP, or GIF logo.")
  const [, encoded] = dataUrl.split(",")
  const bytes = Buffer.from(encoded, "base64")
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) throw new ServiceError(400, "Logo must be 2 MB or smaller.")
  // Older clients sometimes labelled PNG bytes as JPEG. Determine the actual
  // raster format from its signature so those logos migrate without alteration.
  const mimeType = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString("ascii")) ? "image/gif"
    : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP" ? "image/webp" : null
  if (!mimeType) throw new ServiceError(400, "Choose a valid PNG, JPG, WebP, or GIF image file.")
  return { bytes, mimeType, extension: mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] }
}

export async function uploadAgencyLogo(dataUrl: string): Promise<UploadedLogo> {
  const { bytes, mimeType, extension } = decodeLogo(dataUrl)
  const { privateKey } = imagekitConfig()
  // Identical bytes have the same immutable URL, including after migration retries.
  const fileName = `agency-logo-${createHash("sha256").update(bytes).digest("hex")}.${extension}`
  const form = new FormData()
  form.set("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), fileName)
  form.set("fileName", fileName)
  form.set("folder", "/agency-logos")
  form.set("useUniqueFileName", "false")
  form.set("overwriteFile", "true")
  let response: Response
  try {
    response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST", body: form,
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
      signal: AbortSignal.timeout(30_000),
    })
  } catch { throw new ServiceError(502, "Logo upload could not reach ImageKit. Your agency was not saved; please retry.") }
  if (!response.ok) throw new ServiceError(502, "ImageKit could not store the logo. Check the storage credentials and retry.")
  const result = await response.json().catch(() => null)
  if (typeof result?.url !== "string" || typeof result?.fileId !== "string") throw new ServiceError(502, "Logo storage returned an incomplete result. Please retry.")
  return { logoUrl: validateLogoUrl(result.url), logoFileId: result.fileId }
}

type LogoInput = { logoBase64?: string | null; logoUrl?: string | null }
type StoredLogo = LogoInput & { logoFileId?: string | null }

export async function prepareAgencyLogo(input: LogoInput, existing?: StoredLogo) {
  if (input.logoBase64) return { ...await uploadAgencyLogo(input.logoBase64), logoBase64: null }
  if (input.logoUrl) {
    const logoUrl = validateLogoUrl(input.logoUrl)
    return { logoUrl, logoFileId: logoUrl === existing?.logoUrl ? existing.logoFileId || null : null, logoBase64: null }
  }
  // An omitted logo means preserve it; an explicit null means remove it.
  if (input.logoUrl === undefined && input.logoBase64 === undefined && existing) {
    if (existing.logoBase64 && !existing.logoUrl) return { ...await uploadAgencyLogo(existing.logoBase64), logoBase64: null }
    return { logoUrl: existing.logoUrl || null, logoFileId: existing.logoFileId || null, logoBase64: null }
  }
  return { logoUrl: null, logoFileId: null, logoBase64: null }
}
