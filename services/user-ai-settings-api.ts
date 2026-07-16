import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "./api-url"

export type UserAiSettings = {
  hasCustomGeminiKey: boolean
  updatedAt?: string | null
  warning?: string
}

export function getUserAiSettings(baseUrl?: string) {
  return apiFetch<UserAiSettings>(
    resolveApiUrl("/api/user-ai-settings", baseUrl),
  )
}

export function saveUserAiSettings(geminiApiKey: string, baseUrl?: string) {
  return apiFetch<UserAiSettings & { ok: true }>(
    resolveApiUrl("/api/user-ai-settings", baseUrl),
    apiJsonOptions("PUT", { geminiApiKey }),
  )
}

export function removeUserAiSettings(baseUrl?: string) {
  return apiFetch<UserAiSettings & { ok: true }>(
    resolveApiUrl("/api/user-ai-settings", baseUrl),
    { method: "DELETE" },
  )
}
