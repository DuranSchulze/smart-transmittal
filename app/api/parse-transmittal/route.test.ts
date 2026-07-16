import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  parseTransmittalDocument: vi.fn(),
  getDecryptedUserGeminiApiKey: vi.fn(),
}))

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/services/geminiService", () => ({
  parseTransmittalDocument: mocks.parseTransmittalDocument,
}))

vi.mock("@/server/user-ai-settings", () => ({
  getDecryptedUserGeminiApiKey: mocks.getDecryptedUserGeminiApiKey,
}))

import { POST } from "./route"

describe("POST /api/parse-transmittal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue(null)
  })

  it("rejects unauthenticated parsing before invoking Gemini", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-transmittal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "sensitive document content",
          mimeType: "text/plain",
          isText: true,
        }),
      }),
    )

    expect(response.status).toBe(401)
    expect(mocks.parseTransmittalDocument).not.toHaveBeenCalled()
    expect(mocks.getDecryptedUserGeminiApiKey).not.toHaveBeenCalled()
  })
})
