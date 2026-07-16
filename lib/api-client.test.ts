import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiError, apiFetch, apiJsonOptions } from "./api-client"

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

describe("apiFetch", () => {
  afterEach(() => vi.restoreAllMocks())

  it("includes credentials and parses a successful response", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true }))

    await expect(apiFetch<{ ok: boolean }>("/api/example")).resolves.toEqual({
      ok: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/example",
      expect.objectContaining({ credentials: "include" }),
    )
  })

  it("retries transient server failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))

    await expect(
      apiFetch<{ ok: boolean }>("/api/example", {
        retries: 1,
        retryBaseDelayMs: 1,
      }),
    ).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not retry permanent validation failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ error: "Invalid request" }, 400))

    await expect(
      apiFetch("/api/example", { retries: 3, retryBaseDelayMs: 1 }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid request",
    } satisfies Partial<ApiError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("serializes JSON request bodies", () => {
    expect(apiJsonOptions("POST", { value: 1 })).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"value":1}',
    })
  })
})
