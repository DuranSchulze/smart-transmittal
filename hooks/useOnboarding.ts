"use client"

import { useCallback, useEffect, useState } from "react"
import { storage } from "../lib/storage"

type UseOnboardingOptions = {
  userId?: string
  apiBaseUrl: string
}

export function useOnboarding({ userId, apiBaseUrl }: UseOnboardingOptions) {
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false)

  useEffect(() => {
    const state = storage.getOnboardingState()
    if (state && state !== "pending") return
    const timer = setTimeout(() => setIsTourOpen(true), 600)
    return () => clearTimeout(timer)
  }, [])

  const skipTour = useCallback(() => {
    setIsTourOpen(false)
    setTourStep(0)
    storage.setOnboardingState("dismissed")
  }, [])

  const finishTour = useCallback(() => {
    setIsTourOpen(false)
    setTourStep(0)
    storage.setOnboardingState("completed")
  }, [])

  const startTour = useCallback(() => {
    setTourStep(0)
    setIsTourOpen(true)
  }, [])

  const dismissAiPrompt = useCallback(() => {
    setIsAiPromptOpen(false)
    if (userId) storage.dismissAiPrompt(userId)
  }, [userId])

  return {
    isTourOpen,
    tourStep,
    isAiPromptOpen,
    setIsAiPromptOpen,
    nextTourStep: () => setTourStep((step) => step + 1),
    previousTourStep: () => setTourStep((step) => step - 1),
    skipTour,
    finishTour,
    startTour,
    dismissAiPrompt,
  }
}
