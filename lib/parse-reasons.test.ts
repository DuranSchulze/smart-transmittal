import { describe, expect, it } from "vitest"
import { ApiError } from "./api-client"
import { ParseRequestError, classifyProviderError, reasonCopy, reasonFromClientError } from "./parse-reasons"

// REQ-1 / H6: every provider condition maps to exactly one stable reason.
describe("classifyProviderError", () => {
  it.each([
    [Object.assign(new Error("Request timed out"), {}), "provider_timeout"],
    [Object.assign(new Error("deadline exceeded"), { status: 504 }), "provider_timeout"],
    [Object.assign(new Error("got status: 429 RESOURCE_EXHAUSTED quota"), { status: 429 }), "provider_limit"],
    [Object.assign(new Error("Request payload size exceeds the limit"), { status: 400 }), "provider_limit"],
    [Object.assign(new Error("Request Entity Too Large"), { status: 413 }), "provider_limit"],
    [Object.assign(new Error("models/gemini-9 is not found for API version v1beta"), { status: 404 }), "invalid_model"],
    [Object.assign(new Error("API key not valid. Please pass a valid API key."), { status: 400 }), "provider_rejected"],
    [Object.assign(new Error("permission denied"), { status: 403 }), "provider_rejected"],
    [Object.assign(new Error("Internal error encountered"), { status: 500 }), "provider_rejected"],
    [new SyntaxError("Unexpected token < in JSON"), "invalid_output"],
    [new Error("AI returned invalid data structure."), "invalid_output"],
  ])("maps %s to %s", (error, reason) => {
    expect(classifyProviderError(error)).toBe(reason)
  })

  it("gives user copy that never echoes the provider message", () => {
    const raw = "secret payload text from provider"
    const reason = classifyProviderError(new Error(raw))
    expect(reasonCopy(reason)).not.toContain(raw)
    expect(reasonCopy("provider_timeout")).toMatch(/took too long/i)
    expect(reasonCopy("provider_rejected")).not.toMatch(/took too long/i)
  })
})

describe("reasonFromClientError", () => {
  it("reads typed reasons from client errors and route payloads", () => {
    expect(reasonFromClientError(new ParseRequestError("x", "provider_timeout"))).toBe("provider_timeout")
    expect(reasonFromClientError(new ApiError(413, "too large", { error: "too large", reason: "too_large" }))).toBe("too_large")
    expect(reasonFromClientError(new ApiError(500, "boom", { error: "boom" }))).toBe("provider_rejected")
    expect(reasonFromClientError(new ApiError(0, "Failed to fetch"))).toBe("extraction_failed")
  })
})
