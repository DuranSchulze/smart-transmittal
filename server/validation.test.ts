import { describe, expect, it } from "vitest"
import { z } from "zod"
import { validateBody } from "./validation"

describe("validateBody", () => {
  const schema = z.object({ name: z.string(), enabled: z.boolean() })

  it("returns typed data for a valid JSON request", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Draft", enabled: true }),
    })
    const result = await validateBody(request, schema)
    expect("data" in result && result.data).toEqual({
      name: "Draft",
      enabled: true,
    })
  })

  it("returns descriptive field paths for malformed input", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      body: JSON.stringify({ name: 42, enabled: true }),
    })
    const result = await validateBody(request, schema)
    expect("response" in result).toBe(true)
    if ("response" in result) {
      expect(result.response.status).toBe(400)
      await expect(result.response.json()).resolves.toMatchObject({
        error: "Validation failed",
        details: [{ path: "name" }],
      })
    }
  })

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/api/example", {
      method: "POST",
      body: "{broken",
    })
    const result = await validateBody(request, schema)
    expect("response" in result && result.response.status).toBe(400)
  })
})
