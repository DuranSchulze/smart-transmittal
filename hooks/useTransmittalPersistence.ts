"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { AppData } from "../types"
import { useAutoSave, type SaveTransmittalOptions } from "./useAutoSave"
import { createInitialTransmittalData } from "./useTransmittalDraft"
import {
  createTransmittal,
  deleteTransmittal,
  getNextTransmittalNumber,
  getTransmittal,
  getTransmittalSuggestions,
  updateTransmittal,
  type TransmittalSuggestions,
} from "../services/transmittal-api"
import {
  createCopiedDraft,
  mapSavedTransmittalToAppData,
  validateTransmittalNumber,
} from "../services/transmittal-mappers"
import { syncFinalTransmittalToLinkedSheet } from "../services/transmittal-sheet-sync"

const EMPTY_SUGGESTIONS: TransmittalSuggestions = {
  projectNames: [],
  departments: [],
  preparedByNames: [],
  preparedByRoles: [],
  notedByNames: [],
  notedByRoles: [],
}

type UseTransmittalPersistenceOptions = {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  hasFormData: boolean
  isDocumentProcessing: boolean
  userId?: string
  apiBaseUrl: string
}

export function useTransmittalPersistence({
  data,
  setData,
  hasFormData,
  isDocumentProcessing,
  userId,
  apiBaseUrl,
}: UseTransmittalPersistenceOptions) {
  const [activeTransmittalId, setActiveTransmittalId] = useState<string | null>(
    null,
  )
  const activeIdRef = useRef<string | null>(null)
  const [activeTransmittalIsDraft, setActiveTransmittalIsDraft] =
    useState(false)
  const [suggestions, setSuggestions] =
    useState<TransmittalSuggestions>(EMPTY_SUGGESTIONS)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const suggestionsLoadedForRef = useRef<string | null>(null)
  const suggestionsRequestRef = useRef<Promise<TransmittalSuggestions> | null>(null)

  const requestNextNumber = useCallback(async () => {
    if (!apiBaseUrl || !userId) return null
    try {
      return await getNextTransmittalNumber(apiBaseUrl)
    } catch (error) {
      console.error("Failed to fetch next transmittal number", error)
      return null
    }
  }, [apiBaseUrl, userId])

  const assignNextNumber = useCallback(
    async (force = false) => {
      const nextNumber = await requestNextNumber()
      if (!nextNumber) return null
      setData((current) => {
        if (!force && current.project.transmittalNumber) return current
        return {
          ...current,
          project: { ...current.project, transmittalNumber: nextNumber },
        }
      })
      return nextNumber
    },
    [requestNextNumber, setData],
  )

  useEffect(() => {
    suggestionsLoadedForRef.current = null
    suggestionsRequestRef.current = null
    setSuggestions(EMPTY_SUGGESTIONS)
    setSuggestionsError(null)
  }, [userId])

  const loadSuggestions = useCallback(async (force = false) => {
    if (!userId || !apiBaseUrl) return EMPTY_SUGGESTIONS
    if (!force && suggestionsLoadedForRef.current === userId) return suggestions
    if (suggestionsRequestRef.current) return suggestionsRequestRef.current

    setSuggestionsLoading(true)
    setSuggestionsError(null)
    const request = getTransmittalSuggestions(apiBaseUrl)
      .then((value) => {
        setSuggestions(value)
        suggestionsLoadedForRef.current = userId
        return value
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Suggestions could not be loaded."
        setSuggestionsError(message)
        throw error
      })
      .finally(() => {
        suggestionsRequestRef.current = null
        setSuggestionsLoading(false)
      })
    suggestionsRequestRef.current = request
    return request
  }, [apiBaseUrl, suggestions, userId])

  const saveToDatabase = useCallback(
    async (snapshot: AppData, options: SaveTransmittalOptions) => {
      if (!userId || !apiBaseUrl) {
        throw new Error("Your session is unavailable. Sign in again to save.")
      }

      const currentId = activeIdRef.current
      const result = currentId
        ? await updateTransmittal(
            currentId,
            snapshot,
            { isDraft: options.isDraft },
            apiBaseUrl,
          )
        : await createTransmittal(
            snapshot,
            { isDraft: options.isDraft },
            apiBaseUrl,
          )
      const saved = result.transmittal

      activeIdRef.current = saved.id
      setActiveTransmittalId(saved.id)
      setActiveTransmittalIsDraft(Boolean(saved.isDraft))
      const serverNumber = String(saved.project?.transmittalNumber || "")
      setSuggestions((current) => ({
        projectNames: Array.from(new Set([snapshot.project.projectName, ...current.projectNames].filter(Boolean))),
        departments: Array.from(new Set([snapshot.project.department, ...current.departments].filter(Boolean))),
        preparedByNames: Array.from(new Set([snapshot.signatories.preparedBy, ...current.preparedByNames].filter(Boolean))),
        preparedByRoles: Array.from(new Set([snapshot.signatories.preparedByRole, ...current.preparedByRoles].filter(Boolean))),
        notedByNames: Array.from(new Set([snapshot.signatories.notedBy, ...current.notedByNames].filter(Boolean))),
        notedByRoles: Array.from(new Set([snapshot.signatories.notedByRole, ...current.notedByRoles].filter(Boolean))),
      }))
      if (serverNumber && serverNumber !== snapshot.project.transmittalNumber) {
        setData((current) =>
          current.project.transmittalNumber ===
          snapshot.project.transmittalNumber
            ? {
                ...current,
                project: {
                  ...current.project,
                  transmittalNumber: serverNumber,
                },
              }
            : current,
        )
      }

      const shouldSyncSheet =
        !options.isDraft && (!currentId || result.wasDraft === true)
      if (shouldSyncSheet) {
        void syncFinalTransmittalToLinkedSheet(snapshot, serverNumber).catch(
          (error) => console.error("Failed to sync linked sheet", error),
        )
      }
    },
    [apiBaseUrl, setData, userId],
  )

  const autoSave = useAutoSave({
    data,
    enabled: Boolean(userId && apiBaseUrl && hasFormData),
    isDocumentProcessing,
    onSave: saveToDatabase,
  })

  const openTransmittal = useCallback(
    async (id: string) => {
      if (autoSave.dirty) {
        await autoSave.saveNow({ isDraft: true, silent: true })
      }
      await autoSave.waitForIdle()
      const match = await getTransmittal(id, apiBaseUrl)

      setData(mapSavedTransmittalToAppData(match))
      activeIdRef.current = id
      setActiveTransmittalId(id)
      setActiveTransmittalIsDraft(Boolean(match.isDraft))
      autoSave.markClean()
    },
    [apiBaseUrl, autoSave, setData],
  )

  const copyTransmittal = useCallback(
    async (id: string) => {
      if (autoSave.dirty) {
        await autoSave.saveNow({ isDraft: true, silent: true })
      }
      await autoSave.waitForIdle()
      const match = await getTransmittal(id, apiBaseUrl)

      const nextNumber =
        (await requestNextNumber()) ||
        createInitialTransmittalData().project.transmittalNumber
      setData(createCopiedDraft(match, nextNumber))
      activeIdRef.current = null
      setActiveTransmittalId(null)
      setActiveTransmittalIsDraft(true)
      autoSave.markClean()
      autoSave.markDirty()
    },
    [apiBaseUrl, autoSave, requestNextNumber, setData],
  )

  const removeTransmittal = useCallback(
    async (id: string) => {
      if (activeIdRef.current === id) await autoSave.waitForIdle()
      await deleteTransmittal(id, apiBaseUrl)
      if (activeIdRef.current === id) {
        setData(createInitialTransmittalData())
        activeIdRef.current = null
        setActiveTransmittalId(null)
        setActiveTransmittalIsDraft(false)
        autoSave.markClean()
        await assignNextNumber(true)
      }
    },
    [apiBaseUrl, assignNextNumber, autoSave, setData],
  )

  const resetDraft = useCallback(async () => {
    await autoSave.waitForIdle()
    setData(createInitialTransmittalData())
    activeIdRef.current = null
    setActiveTransmittalId(null)
    setActiveTransmittalIsDraft(false)
    autoSave.markClean()
    await assignNextNumber(true)
  }, [assignNextNumber, autoSave, setData])

  const newTransmittal = useCallback(async () => {
    if (autoSave.dirty) {
      await autoSave.saveNow({ isDraft: true, silent: true })
    }
    await resetDraft()
  }, [autoSave, resetDraft])

  const numberValidation = useMemo(
    () =>
      validateTransmittalNumber(
        data.project.transmittalNumber,
        [],
        activeTransmittalId,
      ),
    [activeTransmittalId, data.project.transmittalNumber],
  )

  return {
    activeTransmittalId,
    activeTransmittalIsDraft,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    loadSuggestions,
    numberValidation,
    assignNextNumber,
    openTransmittal,
    copyTransmittal,
    removeTransmittal,
    resetDraft,
    newTransmittal,
    saveToDatabase,
    ...autoSave,
  }
}
