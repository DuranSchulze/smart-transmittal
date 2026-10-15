import { afterEach, describe, expect, it, vi } from "vitest"
import { parseDocument } from "./parse-api"

describe("parseDocument", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

  it("aborts a stalled request and explains the timeout", async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")), { once: true })
      }),
    )
    const result = parseDocument({ content: "text", mimeType: "text/plain", isText: true })
    const assertion = expect(result).rejects.toThrow("Document analysis timed out")
    await vi.advanceTimersByTimeAsync(90_000)
    await assertion
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("clears the timeout after a successful response", async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ items: [] }), { headers: { "Content-Type": "application/json" } },
    ))
    await expect(parseDocument({ content: "text", mimeType: "text/plain", isText: true }))
      .resolves.toEqual({ items: [] })
    expect(vi.getTimerCount()).toBe(0)
  })
})
