"use client"

import { useCallback, useRef, useState } from "react"
import type { TransmittalItem } from "../types"
import { isGenericFileName, resolveDocumentNumberWithFallback } from "../services/geminiService"
import { needsReview, reasonCopy, reasonFromClientError, reviewNote, type ImportFlow, type ParseReason, type ReadMethod } from "../lib/parse-reasons"
import { parseDocument } from "../services/parse-api"
import {
  extractFolderIdFromLink,
  getFileMetadata,
  getFileContentAsBase64,
  listDriveFilePage,
  listFilesInFolder,
} from "../services/googleDriveService"
import { parseGoogleLink } from "../services/google-links"
import { isImageDocument } from "../lib/import-file-policy"

import type { DocumentReference, QaDocumentContent } from "../lib/transmittal-qa"
import { prepareQaContent } from "../services/qa-document-content"

export type DriveFileMeta = { id: string; name: string; mimeType: string; resourceKey?: string }
export type DriveReviewFile = { name: string; note: string }
export type DriveImportResult = { addedCount: number; fallbackCount: number; failedCount?: number; failedFiles?: DriveFileMeta[]; skippedCount?: number; blockedImageCount?: number; reviewFiles?: DriveReviewFile[] }
const describeReview = (result: DriveImportResult) => result.reviewFiles?.length
  ? ` Needs review: ${result.reviewFiles.map(file => `${file.name} (${file.note})`).join("; ")}.`
  : result.fallbackCount ? ` ${result.fallbackCount} file(s) need review because extraction was incomplete.` : ""
export const describeDriveImport = (result: DriveImportResult) =>
  `Imported ${result.addedCount} item(s).${result.blockedImageCount ? ` ${result.blockedImageCount} image(s) were skipped because images are not supported.` : ""}${result.skippedCount ? ` ${result.skippedCount} file(s) already in this transmittal were skipped.` : ""}${describeReview(result)}${result.failedCount ? ` Could not import ${result.failedFiles?.map(file => file.name).join(", ") || `${result.failedCount} file(s)`}. Check the connection and sharing permissions, then retry.` : ""}`

/** Import entry point for diagnostics, derived from the caller's label. */
const flowFor = (label: string): ImportFlow =>
  /selection/i.test(label) ? "drive-selection" : /link/i.test(label) ? "drive-link" : "drive-folder"

type UseDriveImportOptions = {
  apiBaseUrl: string
  getDocumentSession?: () => number
  onDocumentReady?: (document: DocumentReference, content: QaDocumentContent) => void
  isDriveReady: boolean
  addItems: (items: TransmittalItem[]) => void
  existingItems?: TransmittalItem[]
  onStatus: (message: string, type: "info" | "error") => void
}

const IMPORT_REMARK = "Imported from Google Drive"
const ANALYZABLE_EXTENSION = /\.(pdf|docx|doc)$/i
const stripExtension = (name: string) => name.replace(/\.[^/.]+$/, "").trim()
const sourceUrl = (id: string, resourceKey?: string) =>
  `https://drive.google.com/file/d/${id}/view${resourceKey ? `?resourcekey=${encodeURIComponent(resourceKey)}` : ""}`
const analyzable = (file: DriveFileMeta) =>
  ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"].includes(file.mimeType) ||
  ["application/vnd.google-apps.document", "application/vnd.google-apps.presentation"].includes(file.mimeType) ||
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

const driveDocument = (file: DriveFileMeta): DocumentReference => ({
  id: `drive:${file.id}`, name: file.name, mimeType: file.mimeType,
  driveId: file.id, resourceKey: file.resourceKey, revision: crypto.randomUUID(),
})

/** A row built from the file name; `reason` explains why the document was not read. */
const fallbackItem = (file: DriveFileMeta, reason?: ParseReason): TransmittalItem => ({
  document: driveDocument(file),
  id: file.id,
  qty: "1",
  noOfItems: "1",
  // Q4 default: generic names such as "scan.pdf" get no invented number.
  documentNumber: isGenericFileName(file.name) ? "" : fallbackNumber(file),
  description: stripExtension(file.name),
  remarks: reason ? reasonCopy(reason) : IMPORT_REMARK,
  fileType: "gdrive",
  fileSource: sourceUrl(file.id, file.resourceKey),
  extraction: { readMethod: "none", ...(reason ? { reason } : {}) },
})

type Analysis = { items: TransmittalItem[]; fallback: boolean; review?: DriveReviewFile }
const reviewFor = (file: DriveFileMeta, readMethod: ReadMethod, reason?: ParseReason): DriveReviewFile | undefined =>
  needsReview(readMethod, reason) ? { name: file.name, note: reviewNote(readMethod, reason) || "file type not analyzed. Filled from the file name" } : undefined

export function useDriveImport({
  apiBaseUrl,
  onDocumentReady,
  getDocumentSession,
  addItems,
  existingItems = [],
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
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const browseRequestRef = useRef(0)
  const browseQueryRef = useRef("")
  const importBusyRef = useRef(false)
  const existingItemsRef = useRef(existingItems)
  existingItemsRef.current = existingItems
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const analyze = useCallback(
    async (file: DriveFileMeta, flow: ImportFlow): Promise<Analysis> => {
      const session = getDocumentSession?.()
      if (!analyzable(file)) return { items: [fallbackItem(file)], fallback: true, review: reviewFor(file, "none") }
      const { base64, mimeType } = await getFileContentAsBase64(file.id, file.mimeType, file.resourceKey)
      const document = driveDocument(file)
      try {
        const prepared = await prepareQaContent(base64, mimeType || file.mimeType, file.name)
        document.mimeType = prepared.mimeType
        if (getDocumentSession?.() !== session) return { items: [], fallback: false }
        onDocumentReady?.(document, prepared)
        const result = await parseDocument(
          {
            content: prepared.content,
            mimeType: prepared.mimeType,
            isText: prepared.isText,
            fileName: file.name,
            flow,
          },
          apiBaseUrl,
        )
        if (getDocumentSession?.() !== session) return { items: [], fallback: false }
        if (!result.items.length) {
          const reason = result.reason || "invalid_output"
          return { items: [{ ...fallbackItem(file, reason), document }], fallback: true, review: reviewFor(file, "none", reason) }
        }
        const fallback = Boolean(result.error) || (result.fallbackCount || 0) > 0
        const readMethod: ReadMethod = result.readMethod || (result.parser === "fallback" ? "none" : "text")
        const unreadable = readMethod === "none"
        const extraction = { readMethod, ...(result.reason ? { reason: result.reason } : {}) }
        const items = result.items.map((item, index): TransmittalItem => ({
          id: `${file.id}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          qty: item.qty.trim() || "1",
          noOfItems: "1",
          documentNumber: unreadable && isGenericFileName(file.name)
            ? ""
            : resolveDocumentNumberWithFallback({
              currentDocumentNumber: item.documentNumber,
              sourceName: file.name,
              description: item.description || stripExtension(file.name),
              documentType: item.documentType || "File",
            }) || fallbackNumber(file),
          description: item.description.trim() || stripExtension(file.name),
          // REQ-3: never overwrite the failure or review reason with the generic import remark.
          remarks: item.remarks.trim() || IMPORT_REMARK,
          fileType: "gdrive",
          document,
          fileSource: sourceUrl(file.id, file.resourceKey),
          extraction,
        }))
        return { items, fallback, review: reviewFor(file, readMethod, result.reason) }
      } catch (error) {
        if (getDocumentSession?.() !== session) return { items: [], fallback: false }
        const reason = reasonFromClientError(error)
        return { items: [{ ...fallbackItem(file, reason), document }], fallback: true, review: reviewFor(file, "none", reason) }
      }
    },
    [apiBaseUrl, onDocumentReady, getDocumentSession],
  )

  const importFilesWithAi = useCallback(
    async (files: DriveFileMeta[], label: string, flow: ImportFlow = flowFor(label)): Promise<DriveImportResult> => {
      if (importBusyRef.current) throw new Error("An import is already running. Wait for it to finish.")
      importBusyRef.current = true
      const session = getDocumentSession?.()
      const items: TransmittalItem[] = []
      let fallbackCount = 0
      let failedCount = 0
      const failedFiles: DriveFileMeta[] = []
      const reviewFiles: DriveReviewFile[] = []
      let firstError = ""
      const existingIds = new Set(existingItemsRef.current
        .filter(item => item.fileType === "gdrive" && item.fileSource)
        .map(item => parseGoogleLink(item.fileSource!)?.id))
      const allUniqueFiles = Array.from(new Map(files
        .filter(file => file.mimeType !== "application/vnd.google-apps.folder")
        .map(file => [file.id, file])).values())
      const eligibleFiles = allUniqueFiles.filter(file => !isImageDocument(file.mimeType, file.name))
      const blockedImageCount = allUniqueFiles.length - eligibleFiles.length
      const uniqueFiles = eligibleFiles.filter(file => !existingIds.has(file.id))
      const skippedCount = eligibleFiles.length - uniqueFiles.length
      try {
        for (let index = 0; index < uniqueFiles.length; index += 1) {
          if (getDocumentSession?.() !== session) break
          const file = uniqueFiles[index]
          statusRef.current(
            `${label}: analyzing file ${index + 1}/${uniqueFiles.length} (${file.name})...`,
            "info",
          )
          try {
            const result = await analyze(file, flow)
            items.push(...result.items)
            // Show each completed file while the rest of the batch is running.
            if (result.items.length) addItems(result.items)
            if (result.fallback) fallbackCount += 1
            if (result.review && result.items.length) reviewFiles.push(result.review)
          } catch (error) {
            failedCount += 1
            failedFiles.push(file)
            firstError ||= error instanceof Error ? error.message : "Could not download file."
          }
        }
        if (!items.length && !skippedCount) throw new Error(firstError || (blockedImageCount ? "Image imports are not supported. Use PDF or Word documents." : "No importable files found. Subfolders are not imported as documents."))
        return { addedCount: items.length, fallbackCount, failedCount, failedFiles, skippedCount, blockedImageCount, reviewFiles }
      } finally { importBusyRef.current = false }
    },
    [addItems, analyze, getDocumentSession],
  )

  const importFolderLink = useCallback(
    async (link: string) => {
      const parsedLink = parseGoogleLink(link)
      let folderId = extractFolderIdFromLink(link)
      if (!parsedLink) throw new Error("Paste a valid Google Drive folder link.")
      let folderResourceKey = parsedLink.resourceKey
      setIsBulkImporting(true)
      try {
        if (!folderId) {
          const file = await getFileMetadata(parsedLink.id, parsedLink.resourceKey)
          if (file.mimeType !== "application/vnd.google-apps.folder") throw new Error("This link points to a file. Bulk Import needs a folder link.")
          folderId = file.id
          folderResourceKey ||= file.resourceKey
        }
        const files = await listFilesInFolder(folderId, folderResourceKey)
        if (!files.length) {
          throw new Error("No files found in this folder. Only files directly inside the folder are imported.")
        }
        const result = await importFilesWithAi(files, "Drive bulk import")
        statusRef.current(describeDriveImport(result), result.failedCount ? "error" : "info")
      } finally {
        setIsBulkImporting(false)
      }
    },
    [importFilesWithAi],
  )

  const loadFiles = useCallback(
    async (query?: string, pageToken?: string) => {
      const requestId = ++browseRequestRef.current
      setIsDriveLoading(true)
      setDriveError("")
      if (!pageToken) {
        browseQueryRef.current = query?.trim() || ""
        setDriveFiles([])
        setDriveSelected({})
        setNextPageToken(undefined)
      }
      try {
        const page = await listDriveFilePage(query?.trim() || undefined, pageToken)
        if (requestId !== browseRequestRef.current) return
        setDriveFiles(current => pageToken
          ? Array.from(new Map([...current, ...page.files].map(file => [file.id, file])).values())
          : page.files)
        setNextPageToken(page.nextPageToken)
      } catch (error) {
        if (requestId === browseRequestRef.current) setDriveError(error instanceof Error ? error.message : "Failed to load Drive files.")
      } finally {
        if (requestId === browseRequestRef.current) setIsDriveLoading(false)
      }
    }, [],
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
      statusRef.current(describeDriveImport(result), result.failedCount ? "error" : "info")
      if (result.failedFiles?.length) {
        setDriveSelected(Object.fromEntries(result.failedFiles.map(file => [file.id, true])))
        setDriveError(`Could not import: ${result.failedFiles.map(file => file.name).join(", ")}. Check sharing permissions and retry the selected files.`)
      } else {
        setIsDriveModalOpen(false)
      }
    } catch (error) {
      setDriveError(error instanceof Error ? error.message : "Import failed. Please retry.")
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
    hasMoreDriveFiles: Boolean(nextPageToken),
    loadMoreDriveFiles: () => { if (nextPageToken && !isDriveLoading) void loadFiles(browseQueryRef.current, nextPageToken) },
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
