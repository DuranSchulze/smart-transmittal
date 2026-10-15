import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { decodeLogo, prepareAgencyLogo, uploadAgencyLogo, validateLogoUrl } from "./imagekit"

export const PNG_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6l1sAAAAASUVORK5CYII="
const url = "https://ik.imagekit.io/test-account/agency-logos/logo.png"
beforeEach(() => {
  vi.stubEnv("IMAGEKIT_PRIVATE_KEY", "private-test-only")
  vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "https://ik.imagekit.io/test-account")
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("ImageKit logo storage", () => {
  it("uploads actual image bytes with server authentication and returns only the URL and ID", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ url, fileId: "file-1" })))
    await expect(uploadAgencyLogo(PNG_LOGO)).resolves.toEqual({ logoUrl: url, logoFileId: "file-1" })
    const [, options] = fetch.mock.calls[0]
    expect(new Headers(options?.headers).get("Authorization")).toBe(`Basic ${btoa("private-test-only:")}`)
    const form = options!.body as FormData
    expect(form.get("folder")).toBe("/agency-logos")
    expect(form.get("fileName")).toMatch(/^agency-logo-[a-f0-9]{64}\.png$/)
    expect(form.get("useUniqueFileName")).toBe("false")
  })
  it("persists URL metadata instead of inline image data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ url, fileId: "file-1" })))
    expect(await prepareAgencyLogo({ logoBase64: PNG_LOGO })).toEqual({ logoUrl: url, logoFileId: "file-1", logoBase64: null })
  })
  it("preserves an existing URL and file ID without uploading again", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
    expect(await prepareAgencyLogo({ logoUrl: url }, { logoUrl: url, logoFileId: "original" }))
      .toEqual({ logoUrl: url, logoFileId: "original", logoBase64: null })
    expect(fetch).not.toHaveBeenCalled()
  })
  it("clears metadata when removing a logo", async () => {
    expect(await prepareAgencyLogo({ logoUrl: null, logoBase64: null }, { logoUrl: url, logoFileId: "file" }))
      .toEqual({ logoUrl: null, logoFileId: null, logoBase64: null })
  })
  it("recognizes incorrectly labelled legacy PNG logos without changing the bytes", () => {
    expect(decodeLogo(PNG_LOGO.replace("image/png", "image/jpeg")).mimeType).toBe("image/png")
  })
  it("rejects fake images and oversized payloads before upload", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
    await expect(uploadAgencyLogo("data:image/png;base64,aGVsbG8=")).rejects.toMatchObject({ status: 400 })
    await expect(uploadAgencyLogo(`data:image/png;base64,${"A".repeat(3_000_000)}`)).rejects.toMatchObject({ status: 400 })
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each(["http://ik.imagekit.io/test-account/logo.png", "https://evil.example/logo.png", "https://ik.imagekit.io/other-account/logo.png"])("rejects untrusted logo URLs: %s", value => {
    expect(() => validateLogoUrl(value)).toThrow("this system's ImageKit")
  })
  it("reports unavailable storage without exposing credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("upstream error", { status: 401 }))
    await expect(uploadAgencyLogo(PNG_LOGO)).rejects.toMatchObject({ status: 502, message: "ImageKit could not store the logo. Check the storage credentials and retry." })
  })
})
