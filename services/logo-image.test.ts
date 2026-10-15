import { afterEach, expect, it, vi } from "vitest"
import { loadLogoBytes } from "./logo-image"
import { createInitialTransmittalData } from "../hooks/useTransmittalDraft"

afterEach(() => vi.restoreAllMocks())
it("downloads the stored URL as PNG for Word without sending application credentials", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } }))
  const sender = { ...createInitialTransmittalData().sender, logoUrl: "https://ik.imagekit.io/account/agency-logos/logo.webp" }
  expect(await loadLogoBytes(sender)).toEqual(new Uint8Array([137, 80, 78, 71]))
  const [requestUrl, options] = fetch.mock.calls[0]
  expect(new URL(String(requestUrl)).searchParams.get("tr")).toContain("f-png")
  expect(options?.credentials).toBe("omit")
})
it("reports a missing remote logo instead of silently exporting a blank letterhead", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Not found", { status: 404 }))
  const sender = { ...createInitialTransmittalData().sender, logoUrl: "https://ik.imagekit.io/account/logo.png" }
  await expect(loadLogoBytes(sender)).rejects.toThrow("company logo")
})
it("rejects non-image responses and keeps legacy inline logos readable", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("HTML", { headers: { "Content-Type": "text/html" } }))
  const sender = { ...createInitialTransmittalData().sender, logoUrl: "https://ik.imagekit.io/account/logo.png" }
  await expect(loadLogoBytes(sender)).rejects.toThrow("supported image")
  expect(Array.from((await loadLogoBytes({ ...sender, logoUrl: null, logoBase64: "data:image/png;base64,aGVsbG8=" }))!)).toEqual([104, 101, 108, 108, 111])
})
