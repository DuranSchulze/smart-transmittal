"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { AppData, SenderInfo } from "../types"
import { resizeImage } from "./useFileProcessing"
import {
  createAgency,
  deleteAgency,
  listAgencies,
  updateAgency,
  type AgencyRecord,
} from "../services/agency-api"
import {
  extractFileIdFromLink,
  getFileContentAsBase64,
  getFileMetadata,
} from "../services/googleDriveService"

type StatusHandler = (message: string, type: "info" | "error") => void

type UseAgencyManagerOptions = {
  data: AppData
  setData: Dispatch<SetStateAction<AppData>>
  markDirty: () => void
  userId?: string
  apiBaseUrl: string
  isDriveReady: boolean
  onStatus: StatusHandler
}

const emptySender = (): SenderInfo => ({
  agencyName: "",
  addressLine1: "",
  addressLine2: "",
  website: "",
  mobile: "",
  telephone: "",
  email: "",
  logoBase64: null,
})

export const mapAgencyToSender = (agency: AgencyRecord): SenderInfo => ({
  agencyName: agency.name || "",
  addressLine1: agency.addressLine1 || "",
  addressLine2: agency.addressLine2 || "",
  website: agency.website || "",
  mobile: agency.contactNumber || "",
  telephone: agency.telephoneNumber || "",
  email: agency.email || "",
  logoBase64: agency.logoBase64 || null,
})

export function useAgencyManager({
  data,
  setData,
  markDirty,
  userId,
  apiBaseUrl,
  isDriveReady,
  onStatus,
}: UseAgencyManagerOptions) {
  const [agencies, setAgencies] = useState<AgencyRecord[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState("")
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false)
  const [agencyDraft, setAgencyDraft] = useState<SenderInfo>(emptySender)
  const [agencyDriveLogoLink, setAgencyDriveLogoLink] = useState("")
  const [isImportingAgencyDriveLogo, setIsImportingAgencyDriveLogo] =
    useState(false)
  const [agencyModalMode, setAgencyModalMode] = useState<"create" | "update">(
    "create",
  )
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(false)
  const [agencyLoadError, setAgencyLoadError] = useState<string | null>(null)
  const loadedForUserRef = useRef<string | null>(null)
  const loadRequestRef = useRef<Promise<AgencyRecord[]> | null>(null)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const load = useCallback(async (force = false) => {
    if (!userId || !apiBaseUrl) {
      setAgencies([])
      return []
    }
    if (!force && loadedForUserRef.current === userId) return agencies
    if (loadRequestRef.current) return loadRequestRef.current

    setIsLoadingAgencies(true)
    setAgencyLoadError(null)
    const request = listAgencies(apiBaseUrl)
      .then((records) => {
        setAgencies(records)
        loadedForUserRef.current = userId
        return records
      })
      .catch((error) => {
        setAgencyLoadError(error instanceof Error ? error.message : "Agencies could not be loaded.")
        throw error
      })
      .finally(() => {
        loadRequestRef.current = null
        setIsLoadingAgencies(false)
      })
    loadRequestRef.current = request
    return request
  }, [agencies, apiBaseUrl, userId])

  useEffect(() => {
    loadedForUserRef.current = null
    loadRequestRef.current = null
    setAgencies([])
    setAgencyLoadError(null)
  }, [userId])

  useEffect(() => {
    const id = data.agencyId ? String(data.agencyId) : ""
    setSelectedAgencyId(id)
  }, [data.agencyId])

  useEffect(() => {
    if (!selectedAgencyId) return
    const agency = agencies.find((item) => item.id === selectedAgencyId)
    if (!agency) return
    setData((current) => ({
      ...current,
      agencyId: agency.id,
      sender: mapAgencyToSender(agency),
    }))
  }, [agencies, selectedAgencyId, setData])

  const selectAgency = useCallback(
    (agencyId: string) => {
      if (agencyId === selectedAgencyId) return
      markDirty()
      setSelectedAgencyId(agencyId)
    },
    [markDirty, selectedAgencyId],
  )

  const openModal = useCallback(
    (mode: "create" | "update") => {
      setAgencyDriveLogoLink("")
      if (mode === "update") {
        const agency = agencies.find((item) => item.id === selectedAgencyId)
        if (!agency) {
          statusRef.current("Select an agency first to update.", "error")
          return
        }
        setAgencyDraft(mapAgencyToSender(agency))
      } else {
        setAgencyDraft(emptySender())
      }
      setAgencyModalMode(mode)
      setIsAgencyModalOpen(true)
    },
    [agencies, selectedAgencyId],
  )

  const uploadLogo = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const base64 = await resizeImage(file, 400)
      setAgencyDraft((current) => ({
        ...current,
        logoBase64: `data:image/jpeg;base64,${base64}`,
      }))
    } catch {
      statusRef.current("Couldn't load the logo file.", "error")
    } finally {
      event.target.value = ""
    }
  }, [])

  const importDriveLogo = useCallback(async () => {
    const link = agencyDriveLogoLink.trim()
    if (!link) return statusRef.current("Paste a Google Drive file link first.", "error")
    if (!isDriveReady) {
      return statusRef.current("Google Drive is not connected. Please sign in again.", "error")
    }
    const fileId = extractFileIdFromLink(link)
    if (!fileId) return statusRef.current("Invalid Google Drive file link.", "error")

    setIsImportingAgencyDriveLogo(true)
    try {
      const metadata = await getFileMetadata(fileId)
      if (!metadata.mimeType.startsWith("image/")) {
        throw new Error("Selected Google Drive file is not an image.")
      }
      const { base64, mimeType } = await getFileContentAsBase64(fileId)
      const type = mimeType.startsWith("image/") ? mimeType : metadata.mimeType
      setAgencyDraft((current) => ({
        ...current,
        logoBase64: `data:${type};base64,${base64}`,
      }))
      setAgencyDriveLogoLink("")
      statusRef.current(`Logo imported from Google Drive (${metadata.name}).`, "info")
    } catch (error) {
      statusRef.current(
        error instanceof Error ? error.message : "Couldn't import the logo.",
        "error",
      )
    } finally {
      setIsImportingAgencyDriveLogo(false)
    }
  }, [agencyDriveLogoLink, isDriveReady])

  const save = useCallback(async () => {
    if (!userId || !apiBaseUrl) return
    const name = agencyDraft.agencyName.trim()
    if (!name) return
    const input = {
      name,
      addressLine1: agencyDraft.addressLine1 || null,
      addressLine2: agencyDraft.addressLine2 || null,
      website: agencyDraft.website || null,
      telephoneNumber: agencyDraft.telephone || null,
      contactNumber: agencyDraft.mobile || null,
      email: agencyDraft.email || null,
      logoBase64: agencyDraft.logoBase64 || null,
    }
    try {
      const updating = agencyModalMode === "update" && Boolean(selectedAgencyId)
      const saved = updating
        ? await updateAgency(selectedAgencyId, input, apiBaseUrl)
        : await createAgency(input, apiBaseUrl)
      await load(true)
      markDirty()
      setSelectedAgencyId(saved.id)
      setData((current) => ({
        ...current,
        agencyId: saved.id,
        sender: mapAgencyToSender(saved),
      }))
      setIsAgencyModalOpen(false)
      statusRef.current(updating ? "Agency updated" : "Agency added", "info")
    } catch (error) {
      statusRef.current(
        error instanceof Error ? error.message : "Failed to save agency",
        "error",
      )
    }
  }, [
    agencyDraft,
    agencyModalMode,
    apiBaseUrl,
    load,
    markDirty,
    selectedAgencyId,
    setData,
    userId,
  ])

  const remove = useCallback(async () => {
    if (!userId || !apiBaseUrl || !selectedAgencyId) return
    const agency = agencies.find((item) => item.id === selectedAgencyId)
    if (!window.confirm(`Delete "${agency?.name || "this agency"}" from saved agencies?`)) return
    try {
      await deleteAgency(selectedAgencyId, apiBaseUrl)
      await load(true)
      markDirty()
      setSelectedAgencyId("")
      setData((current) => ({ ...current, agencyId: null }))
      statusRef.current("Agency deleted", "info")
    } catch (error) {
      statusRef.current(
        error instanceof Error ? error.message : "Failed to delete agency",
        "error",
      )
    }
  }, [agencies, apiBaseUrl, load, markDirty, selectedAgencyId, setData, userId])

  return {
    agencies,
    isLoadingAgencies,
    agencyLoadError,
    loadAgencies: load,
    selectedAgencyId,
    selectAgency,
    isAgencyModalOpen,
    setIsAgencyModalOpen,
    agencyDraft,
    setAgencyDraft,
    agencyDriveLogoLink,
    setAgencyDriveLogoLink,
    isImportingAgencyDriveLogo,
    agencyModalMode,
    openModal,
    uploadLogo,
    importDriveLogo,
    save,
    remove,
  }
}
