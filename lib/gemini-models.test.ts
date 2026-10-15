import { describe, expect, it } from "vitest"
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_OPTIONS,
  getGeminiModelLabel,
  isSupportedGeminiModelId,
  normalizeGeminiModel,
} from "./gemini-models"

describe("gemini model catalog", () => {
  it("includes the default model in the selectable options", () => {
    expect(GEMINI_MODEL_OPTIONS.map((option) => option.id)).toContain(
      DEFAULT_GEMINI_MODEL,
    )
  })

  it("normalizes valid model ids and trims whitespace", () => {
    expect(normalizeGeminiModel("  gemini-2.5-pro ")).toBe("gemini-2.5-pro")
    expect(normalizeGeminiModel("gemini-3.0-flash-preview")).toBe(
      "gemini-3.0-flash-preview",
    )
  })

  it("rejects empty, malformed, or unsafe model ids", () => {
    expect(normalizeGeminiModel("")).toBeNull()
    expect(normalizeGeminiModel("   ")).toBeNull()
    expect(normalizeGeminiModel(undefined)).toBeNull()
    expect(normalizeGeminiModel(null)).toBeNull()
    expect(normalizeGeminiModel("bad model!")).toBeNull()
    expect(normalizeGeminiModel("../../etc/passwd")).toBeNull()
  })

  it("recognizes curated options", () => {
    expect(isSupportedGeminiModelId("gemini-2.5-flash")).toBe(true)
    expect(isSupportedGeminiModelId("gemini-unknown-model")).toBe(false)
  })

  it("falls back to the raw id when no label is known", () => {
    expect(getGeminiModelLabel("gemini-2.5-flash")).toBe("Gemini 2.5 Flash")
    expect(getGeminiModelLabel("gemini-3.0-flash-preview")).toBe(
      "gemini-3.0-flash-preview",
    )
  })
})
