import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  parseTransmittalDocument: vi.fn(),
  getDecryptedUserGeminiApiKey: vi.fn(),
  getUserGeminiModel: vi.fn(),
  preparePdf: vi.fn(),
}))

vi.mock("@/server/pdf-parsing", () => ({ preparePdfForParsing: mocks.preparePdf }))

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))

vi.mock("@/services/geminiService", () => ({
  parseTransmittalDocument: mocks.parseTransmittalDocument,
}))

vi.mock("@/server/user-ai-settings", () => ({
  getDecryptedUserGeminiApiKey: mocks.getDecryptedUserGeminiApiKey,
  getUserGeminiModel: mocks.getUserGeminiModel,
}))

import { POST } from "./route"

describe("POST /api/parse-transmittal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue(null)
    mocks.getUserGeminiModel.mockResolvedValue(null)
    mocks.preparePdf.mockImplementation(async (content, mimeType, isText) => ({
      content, mimeType, isText, extractedPdfText: false,
    }))
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
  it.each([
    { mimeType: "image/png", fileName: "scan.png" },
    { mimeType: "application/pdf", fileName: "scan.jpg" },
  ])("rejects image documents before extraction or Gemini: %j", async input => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    const response = await POST(new Request("http://localhost/api/parse-transmittal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "image-content", isText: false, ...input }),
    }))
    expect(response.status).toBe(415)
    expect(mocks.preparePdf).not.toHaveBeenCalled()
    expect(mocks.parseTransmittalDocument).not.toHaveBeenCalled()
    expect(mocks.getDecryptedUserGeminiApiKey).not.toHaveBeenCalled()
  })

  it("returns extraction results with separate stage timings", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.getDecryptedUserGeminiApiKey.mockResolvedValue("personal-key")
    mocks.parseTransmittalDocument.mockResolvedValue({ items: [] })
    const response = await POST(new Request("http://localhost/api/parse-transmittal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "text", mimeType: "text/plain", isText: true }),
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [] })
    expect(response.headers.get("Server-Timing")).toMatch(/auth;dur=.*settings;dur=.*parse;dur=.*total;dur=/)
    expect(mocks.parseTransmittalDocument).toHaveBeenCalledWith(
      "text", "text/plain", true, undefined, "personal-key", false, undefined,
    )
  })
  it("forwards the user's selected Gemini model to the parser", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.getDecryptedUserGeminiApiKey.mockResolvedValue(null)
    mocks.getUserGeminiModel.mockResolvedValue("gemini-2.5-pro")
    mocks.parseTransmittalDocument.mockResolvedValue({ items: [] })
    const response = await POST(new Request("http://localhost/api/parse-transmittal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "text", mimeType: "text/plain", isText: true }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.parseTransmittalDocument).toHaveBeenCalledWith(
      "text", "text/plain", true, undefined, undefined, false, "gemini-2.5-pro",
    )
  })
  it("passes locally extracted PDF text into single-document parsing", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.getDecryptedUserGeminiApiKey.mockResolvedValue("personal-key")
    mocks.preparePdf.mockResolvedValue({
      content: "extracted cover text", mimeType: "text/plain", isText: true, extractedPdfText: true,
    })
    mocks.parseTransmittalDocument.mockResolvedValue({ items: [] })
    const response = await POST(new Request("http://localhost/api/parse-transmittal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "JVBERg==", mimeType: "application/pdf", isText: false, fileName: "invoice.pdf" }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.parseTransmittalDocument).toHaveBeenCalledWith(
      "extracted cover text", "text/plain", true, "invoice.pdf", "personal-key", true, undefined,
    )
  })
  it("skips Gemini and AI key lookup when local document identity is solid", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user-1" } })
    mocks.preparePdf.mockResolvedValue({
      content: "Title: Office Renovation Invoice\nInvoice No: INV-12345\nRecipient: Acme Corporation",
      mimeType: "text/plain", isText: true, extractedPdfText: true,
    })
    const response = await POST(new Request("http://localhost/api/parse-transmittal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "JVBERg==", mimeType: "application/pdf", isText: false, fileName: "invoice.pdf" }),
    }))
    expect((await response.json()).parser).toBe("pdf-inspector")
    expect(mocks.parseTransmittalDocument).not.toHaveBeenCalled()
    expect(mocks.getDecryptedUserGeminiApiKey).not.toHaveBeenCalled()
  })
})
