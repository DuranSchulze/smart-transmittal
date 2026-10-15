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
import { parseGoogleLink } from "../services/google-links"
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
  logoUrl: null,
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
  logoUrl: agency.logoUrl || null,
  logoBase64: agency.logoUrl ? null : agency.logoBase64 || null,
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
  const [editingAgencyId, setEditingAgencyId] = useState("")
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false)
  const [agencyDraft, setAgencyDraft] = useState<SenderInfo>(emptySender)
  const [agencyDriveLogoLink, setAgencyDriveLogoLink] = useState("")
  const [isImportingAgencyDriveLogo, setIsImportingAgencyDriveLogo] =
    useState(false)
  const [agencyModalMode, setAgencyModalMode] = useState<"create" | "update">(
    "create",
  )
  const [isUploadingAgencyLogo, setIsUploadingAgencyLogo] = useState(false)
  const [isSavingAgency, setIsSavingAgency] = useState(false)
  const [agencySaveError, setAgencySaveError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const userRef = useRef(userId)
  userRef.current = userId
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
        if (userRef.current !== userId) return records
        setAgencies(records)
        loadedForUserRef.current = userId
        return records
      })
      .catch((error) => {
        if (userRef.current !== userId) throw error
        setAgencyLoadError(error instanceof Error ? error.message : "Agencies could not be loaded.")
        throw error
      })
      .finally(() => {
        if (userRef.current !== userId) return
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
    setIsLoadingAgencies(false)
  }, [userId])

  useEffect(() => {
    const id = data.agencyId ? String(data.agencyId) : ""
    setSelectedAgencyId(id)
  }, [data.agencyId])

  const selectAgency = useCallback(
    (agencyId: string) => {
      const agency = agencies.find(item => item.id === agencyId)
      if (agencyId && !agency) return
      markDirty()
      setSelectedAgencyId(agencyId)
      setData(current => ({
        ...current,
        agencyId: agency?.id || null,
        sender: agency ? mapAgencyToSender(agency) : current.sender,
      }))
    }, [agencies, markDirty, setData],
  )

  const openModal = useCallback(
    (mode: "create" | "update", agencyId = selectedAgencyId) => {
      setAgencyDriveLogoLink("")
      setAgencySaveError(null)
      if (mode === "update") {
        const agency = agencies.find((item) => item.id === agencyId)
        if (!agency) {
          statusRef.current("Select an agency first to update.", "error")
          return
        }
        if (!agency.canManage) {
          statusRef.current("Only the agency creator can change its shared details. You can create a new agency instead.", "error")
          return
        }
        setAgencyDraft(mapAgencyToSender(agency))
      } else {
        setAgencyDraft(emptySender())
      }
      setEditingAgencyId(mode === "update" ? agencyId : "")
      setAgencyModalMode(mode)
      setIsAgencyModalOpen(true)
    },
    [agencies, selectedAgencyId],
  )

  const uploadLogo = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploadingAgencyLogo(true)
    try {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error("Choose a PNG, JPG, WebP, or GIF logo.")
      if (file.size > 2 * 1024 * 1024) throw new Error("Logo must be 2 MB or smaller.")
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error("Could not read the logo."))
        reader.readAsDataURL(file)
      })
      setAgencySaveError(null)
      setAgencyDraft((current) => ({
        ...current,
        logoUrl: null,
        logoBase64: dataUrl,
      }))
    } catch (error) {
      setAgencySaveError(error instanceof Error ? error.message : "Could not load the logo.")
    } finally {
      setIsUploadingAgencyLogo(false)
      event.target.value = ""
    }
  }, [])

  const importDriveLogo = useCallback(async () => {
    const link = agencyDriveLogoLink.trim()
    if (!link) return statusRef.current("Paste a Google Drive file link first.", "error")
    if (!isDriveReady) {
      return statusRef.current("Google Drive is not connected. Please sign in again.", "error")
    }
    const parsedLink = parseGoogleLink(link)
    const fileId = extractFileIdFromLink(link)
    if (!fileId) return setAgencySaveError("Paste a valid Google Drive file link for the logo.")

    setAgencySaveError(null)
    setIsImportingAgencyDriveLogo(true)
    try {
      const metadata = await getFileMetadata(fileId, parsedLink?.resourceKey)
      if (!metadata.mimeType.startsWith("image/")) {
        throw new Error("Selected Google Drive file is not an image.")
      }
      const { base64, mimeType } = await getFileContentAsBase64(fileId, metadata.mimeType, parsedLink?.resourceKey || metadata.resourceKey, "agency-logo")
      const type = mimeType.startsWith("image/") ? mimeType : metadata.mimeType
      setAgencyDraft((current) => ({
        ...current,
        logoUrl: null,
        logoBase64: `data:${type};base64,${base64}`,
      }))
      setAgencyDriveLogoLink("")
      statusRef.current(`Logo imported from Google Drive (${metadata.name}).`, "info")
    } catch (error) {
      setAgencySaveError(error instanceof Error ? error.message : "Could not import the logo.")
    } finally {
      setIsImportingAgencyDriveLogo(false)
    }
  }, [agencyDriveLogoLink, isDriveReady])

  const save = useCallback(async () => {
    if (!userId || !apiBaseUrl || savingRef.current || isUploadingAgencyLogo || isImportingAgencyDriveLogo) return
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
      logoUrl: agencyDraft.logoUrl || null,
      logoBase64: agencyDraft.logoBase64 || null,
    }
    savingRef.current = true
    setIsSavingAgency(true)
    setAgencySaveError(null)
    try {
      const updating = agencyModalMode === "update"
      if (updating && !agencies.find(agency => agency.id === editingAgencyId)?.canManage) throw new Error("Only the agency creator can edit shared details.")
      const saved = updating
        ? await updateAgency(editingAgencyId, input, apiBaseUrl)
        : await createAgency(input, apiBaseUrl)
      if (userRef.current !== userId) return
      setAgencies(current => [...current.filter(agency => agency.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)))
      if (!updating || selectedAgencyId === saved.id) {
        markDirty()
        setSelectedAgencyId(saved.id)
        setData((current) => ({
          ...current,
          agencyId: saved.id,
          sender: mapAgencyToSender(saved),
        }))
      }
      setIsAgencyModalOpen(false)
      statusRef.current(updating ? "Shared agency updated. Existing transmittals keep their saved sender details." : "Agency created and available to everyone.", "info")
    } catch (error) {
      setAgencySaveError(error instanceof Error ? error.message : "Failed to save agency")
    } finally {
      savingRef.current = false
      setIsSavingAgency(false)
    }
  }, [
    agencyDraft,
    isUploadingAgencyLogo,
    isImportingAgencyDriveLogo,
    agencies,
    agencyModalMode,
    editingAgencyId,
    apiBaseUrl,
    load,
    markDirty,
    selectedAgencyId,
    setData,
    userId,
  ])

  const remove = useCallback(async (agencyId = selectedAgencyId) => {
    if (!userId || !apiBaseUrl || !agencyId) return
    const agency = agencies.find((item) => item.id === agencyId)
    if (!agency) return
    if (!window.confirm(`Delete "${agency?.name || "this agency"}" from the shared agency library? Saved transmittals keep their sender details.`)) return
    try {
      await deleteAgency(agencyId, apiBaseUrl)
      setAgencies(current => current.filter(item => item.id !== agencyId))
      if (selectedAgencyId === agencyId) {
        markDirty()
        setSelectedAgencyId("")
        setData((current) => ({ ...current, agencyId: null }))
      }
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
    isSavingAgency,
    isUploadingAgencyLogo,
    agencySaveError,
    canManageSelectedAgency: Boolean(agencies.find(agency => agency.id === selectedAgencyId)?.canManage),
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
