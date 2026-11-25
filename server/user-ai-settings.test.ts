import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock("@/server/auth", () => ({ db: { userAiSettings: { findUnique: mocks.findUnique } } }))
import { encryptUserGeminiApiKey, getUserAiKeyMetadata, resolveUserGeminiKey } from "./user-ai-settings"

const KEY = "AIzaSyTestKey_1234567890abcdefghij"

// H3 / REQ-5: an undecryptable personal key is reported, never silently replaced.
describe("personal key integrity", () => {
  let stored = ""
  beforeEach(() => {
    vi.stubEnv("APP_SETTINGS_ENCRYPTION_KEY", "secret-one")
    stored = encryptUserGeminiApiKey(KEY)
    mocks.findUnique.mockImplementation(async () => ({ geminiApiKeyEncrypted: stored, geminiModel: null, updatedAt: null }))
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it("resolves a usable key", async () => {
    expect(await resolveUserGeminiKey("u1")).toEqual({ apiKey: KEY, personalKeyStatus: "usable" })
    expect((await getUserAiKeyMetadata("u1")).personalKeyStatus).toBe("usable")
  })

  it("reports a key encrypted with a rotated secret as unusable", async () => {
    vi.stubEnv("APP_SETTINGS_ENCRYPTION_KEY", "secret-two")
    expect(await resolveUserGeminiKey("u1")).toEqual({ apiKey: null, personalKeyStatus: "unusable" })
    const metadata = await getUserAiKeyMetadata("u1")
    expect(metadata).toMatchObject({ hasCustomGeminiKey: true, personalKeyStatus: "unusable" })
    expect(JSON.stringify(metadata)).not.toContain(KEY)
  })

  it("reports corrupted ciphertext and a missing secret as unusable", async () => {
    stored = "not.a.validpayload"
    expect((await resolveUserGeminiKey("u1")).personalKeyStatus).toBe("unusable")
    stored = encryptUserGeminiApiKey(KEY)
    vi.stubEnv("APP_SETTINGS_ENCRYPTION_KEY", "")
    expect((await getUserAiKeyMetadata("u1")).personalKeyStatus).toBe("unusable")
  })

  it("reports none when no key is stored", async () => {
    mocks.findUnique.mockResolvedValue(null)
    expect(await resolveUserGeminiKey("u1")).toEqual({ apiKey: null, personalKeyStatus: "none" })
  })
})
