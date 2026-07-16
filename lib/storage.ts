const STORAGE_KEYS = {
  onboarding: "transmittal_onboarding_state_v1",
  linkedSheetId: "transmittal_linked_sheet_id",
  aiPromptDismissed: (userId: string) =>
    `transmittal_ai_key_prompt_dismissed_v1:${userId}`,
} as const

export type OnboardingState = "pending" | "dismissed" | "completed"

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const read = (key: string): string | null => {
  try {
    return getStorage()?.getItem(key) ?? null
  } catch {
    return null
  }
}

const write = (key: string, value: string): boolean => {
  try {
    const target = getStorage()
    if (!target) return false
    target.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const remove = (key: string): boolean => {
  try {
    const target = getStorage()
    if (!target) return false
    target.removeItem(key)
    return true
  } catch {
    return false
  }
}

export const storage = {
  getOnboardingState(): OnboardingState | null {
    const value = read(STORAGE_KEYS.onboarding)
    return value === "pending" || value === "dismissed" || value === "completed"
      ? value
      : null
  },

  setOnboardingState(value: OnboardingState): boolean {
    return write(STORAGE_KEYS.onboarding, value)
  },

  isAiPromptDismissed(userId: string): boolean {
    return read(STORAGE_KEYS.aiPromptDismissed(userId)) === "dismissed"
  },

  dismissAiPrompt(userId: string): boolean {
    return write(STORAGE_KEYS.aiPromptDismissed(userId), "dismissed")
  },

  getLinkedSheetId(): string | null {
    return read(STORAGE_KEYS.linkedSheetId)
  },

  setLinkedSheetId(sheetId: string): boolean {
    return write(STORAGE_KEYS.linkedSheetId, sheetId)
  },

  clearLinkedSheetId(): boolean {
    return remove(STORAGE_KEYS.linkedSheetId)
  },
}
