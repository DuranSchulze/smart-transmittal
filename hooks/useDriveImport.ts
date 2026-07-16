"use client"

import { useCallback, useRef, useState } from "react"
import type { TransmittalItem } from "../types"
import { resolveDocumentNumberWithFallback } from "../services/geminiService"
import { parseDocument } from "../services/parse-api"
import {
  extractFolderIdFromLink,
  getFileContentAsBase64,
  listDriveFiles,
  listFilesInFolder,
} from "../services/googleDriveService"

export type DriveFileMeta = { id: string; name: string; mimeType: string }
export type DriveImportResult = { addedCount: number; fallbackCount: number }

type UseDriveImportOptions = {
  apiBaseUrl: string
  isDriveReady: boolean
  addItems: (items: TransmittalItem[]) => void
  onStatus: (message: string, type: "info" | "error") => void
}

const IMPORT_REMARK = "Imported from Google Drive"
const ANALYZABLE_EXTENSION = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?)$/i
const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "").trim()
const sourceUrl = (id: string) => `https://drive.google.com/file/d/${id}/view`
const analyzable = (file: DriveFileMeta) =>
  file.mimeType === "application/pdf" ||
  file.mimeType.startsWith("image/") ||
  ANALYZABLE_EXTENSION.test(file.name)

const normalizeNumber = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")

const fallbackNumber = (file: Pick<DriveFileMeta, "id" | "name">) => {
  const resolved = normalizeNumber(
    resolveDocumentNumberWithFallback({
      sourceName: file.name,
      description: stripExtension(file.name) || file.name,
      documentType: "File",
    }),
  )
  if (resolved) return resolved
  const base = normalizeNumber(stripExtension(file.name))
  const suffix = normalizeNumber(file.id).slice(-4) || "0000"
  return base
    ? `DRV-${base.slice(0, 16).replace(/-+$/g, "")}-${suffix}`
    : `DRV-${suffix}`
}

const fallbackItem = (file: DriveFileMeta): TransmittalItem => ({
  id: file.id,
  qty: "1",
  noOfItems: "1",
  documentNumber: fallbackNumber(file),
  description: stripExtension(file.name),
  remarks: IMPORT_REMARK,
  fileType: "gdrive",
  fileSource: sourceUrl(file.id),
})

export function useDriveImport({
  apiBaseUrl,
  isDriveReady,
  addItems,
  onStatus,
}: UseDriveImportOptions) {
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFileMeta[]>([])
  const [driveSearch, setDriveSearch] = useState("")
  const [driveSelected, setDriveSelected] = useState<Record<string, boolean>>({})
  const [driveError, setDriveError] = useState("")
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [isDriveSelectionImporting, setIsDriveSelectionImporting] =
    useState(false)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const analyze = useCallback(
    async (file: DriveFileMeta) => {
      if (!analyzable(file)) return { items: [fallbackItem(file)], fallback: true }
      try {
        const { base64, mimeType } = await getFileContentAsBase64(file.id)
        const result = await parseDocument(
          {
            content: base64,
            mimeType: mimeType || file.mimeType || "application/pdf",
            isText: false,
            fileName: file.name,
          },
          apiBaseUrl,
        )
        if (!result.items.length) {
          return { items: [fallbackItem(file)], fallback: true }
        }
        const forceRemark = Boolean(result.error) || (result.fallbackCount || 0) > 0
        const items = result.items.map((item, index): TransmittalItem => ({
          id: `${file.id}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          qty: item.qty.trim() || "1",
          noOfItems: "1",
          documentNumber:
            resolveDocumentNumberWithFallback({
              currentDocumentNumber: item.documentNumber,
              sourceName: file.name,
              description: item.description || stripExtension(file.name),
              documentType: item.documentType || "File",
            }) || fallbackNumber(file),
          description: item.description.trim() || stripExtension(file.name),
          remarks: forceRemark
            ? IMPORT_REMARK
            : item.remarks.trim() || IMPORT_REMARK,
          fileType: "gdrive",
          fileSource: sourceUrl(file.id),
        }))
        return { items, fallback: forceRemark }
      } catch {
        return { items: [fallbackItem(file)], fallback: true }
      }
    },
    [apiBaseUrl],
  )

  const importFilesWithAi = useCallback(
    async (files: DriveFileMeta[], label: string): Promise<DriveImportResult> => {
      const items: TransmittalItem[] = []
      let fallbackCount = 0
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        statusRef.current(
          `${label}: analyzing file ${index + 1}/${files.length} (${file.name})...`,
          "info",
        )
        const result = await analyze(file)
        items.push(...result.items)
        if (result.fallback) fallbackCount += 1
      }
      if (items.length) addItems(items)
      return { addedCount: items.length, fallbackCount }
    },
    [addItems, analyze],
  )

  const importFolderLink = useCallback(
    async (link: string) => {
      const folderId = extractFolderIdFromLink(link)
      if (!folderId) throw new Error("Invalid Google Drive folder link.")
      if (!isDriveReady) throw new Error("Drive access not available. Please sign in again.")
      setIsBulkImporting(true)
      try {
        const files = await listFilesInFolder(folderId)
        if (!files.length) {
          statusRef.current("No files found in the selected Drive folder.", "info")
          return
        }
        const result = await importFilesWithAi(files, "Drive bulk import")
        statusRef.current(
          result.fallbackCount
            ? `Imported ${result.addedCount} item(s) from ${files.length} file(s). Document # fallback was used for ${result.fallbackCount} file(s).`
            : `Imported ${result.addedCount} item(s) from ${files.length} file(s) using AI extraction.`,
          "info",
        )
      } finally {
        setIsBulkImporting(false)
      }
    },
    [importFilesWithAi, isDriveReady],
  )

  const loadFiles = useCallback(
    async (query?: string) => {
      if (!isDriveReady) {
        setDriveError("Drive access not available. Please sign in again.")
        return
      }
      setIsDriveLoading(true)
      setDriveError("")
      try {
        setDriveFiles(await listDriveFiles(query?.trim() || undefined))
        setDriveSelected({})
      } catch (error) {
        setDriveError(error instanceof Error ? error.message : "Failed to load Drive files.")
      } finally {
        setIsDriveLoading(false)
      }
    },
    [isDriveReady],
  )

  const openModal = useCallback(() => {
    setIsDriveModalOpen(true)
    void loadFiles()
  }, [loadFiles])

  const toggle = useCallback((id: string) => {
    setDriveSelected((current) => ({ ...current, [id]: !current[id] }))
  }, [])

  const toggleAll = useCallback(() => {
    setDriveSelected((current) => {
      const selected = !driveFiles.every((file) => current[file.id])
      return Object.fromEntries(driveFiles.map((file) => [file.id, selected]))
    })
  }, [driveFiles])

  const addSelected = useCallback(async () => {
    const selected = driveFiles.filter((file) => driveSelected[file.id])
    if (!selected.length) return
    setIsDriveSelectionImporting(true)
    try {
      const result = await importFilesWithAi(selected, "Drive selection")
      statusRef.current(
        result.fallbackCount
          ? `Added ${result.addedCount} item(s) from ${selected.length} selected file(s). Document # fallback was used for ${result.fallbackCount} file(s).`
          : `Added ${result.addedCount} item(s) from ${selected.length} selected file(s) using AI extraction.`,
        "info",
      )
      setIsDriveModalOpen(false)
    } finally {
      setIsDriveSelectionImporting(false)
    }
  }, [driveFiles, driveSelected, importFilesWithAi])

  return {
    isDriveModalOpen,
    setIsDriveModalOpen,
    driveFiles,
    driveSearch,
    setDriveSearch,
    driveSelected,
    driveError,
    isDriveLoading,
    isBulkImporting,
    isDriveSelectionImporting,
    importFilesWithAi,
    importFolderLink,
    openModal,
    search: () => loadFiles(driveSearch),
    toggle,
    toggleAll,
    addSelected,
  }
}
