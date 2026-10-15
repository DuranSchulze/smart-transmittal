"use client"

import { useCallback, useRef, useState } from "react"
import type { TransmittalItem } from "../types"
import type {
  DriveFileMeta,
  DriveImportResult,
} from "./useDriveImport"
import {
  extractFileIdFromLink,
  extractFolderIdFromLink,
  getFileMetadata,
  isFolderLink,
  listFilesInFolder,
} from "../services/googleDriveService"
import {
  extractSheetIdFromUrl,
  isSheetUrl,
  readSheetRows,
} from "../services/googleSheetsService"
import { parseGoogleLink } from "../services/google-links"
import { describeDriveImport } from "./useDriveImport"

type StatusType = "info" | "error"

type UseSmartImportOptions = {
  isDriveReady: boolean
  addItems: (items: TransmittalItem[]) => void
  importDriveFiles: (
    files: DriveFileMeta[],
    label: string,
  ) => Promise<DriveImportResult>
  onStatus: (message: string, type: StatusType) => void
}

const findColumn = (headers: string[], ...names: string[]) => {
  for (const name of names) {
    const index = headers.findIndex((header) => header.includes(name))
    if (index >= 0) return index
  }
  return -1
}

export function useSmartImport({
  addItems,
  importDriveFiles,
  onStatus,
}: UseSmartImportOptions) {
  const [smartInput, setSmartInput] = useState("")
  const [isAnalyzingText, setIsAnalyzingText] = useState(false)
  const busyRef = useRef(false)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const analyze = useCallback(async () => {
    const input = smartInput.trim()
    if (!input || busyRef.current) return
    const parsedLink = parseGoogleLink(input)
    if (!parsedLink) {
      statusRef.current("Paste a valid Google Drive, Docs, Slides, or Sheets link.", "error")
      return
    }
    busyRef.current = true

    setIsAnalyzingText(true)
    statusRef.current("Analyzing link...", "info")
    try {
      let totalAdded = 0
      let fallbackCount = 0
      let failedCount = 0
      let driveResult: DriveImportResult | undefined

      if (isSheetUrl(input)) {
        const sheetId = extractSheetIdFromUrl(input)
        if (!sheetId) {
          statusRef.current("Invalid Google Sheets link.", "error")
          return
        }

        statusRef.current("Reading spreadsheet...", "info")
        const { headers, rows } = await readSheetRows(sheetId)
        if (!rows.length) {
          statusRef.current("Spreadsheet is empty or has no data rows.", "error")
          return
        }

        const normalizedHeaders = headers.map((header) =>
          header.toLowerCase().trim(),
        )
        const descriptionIndex = Math.max(
          0,
          findColumn(normalizedHeaders, "description", "name", "title"),
        )
        const quantityIndex = findColumn(normalizedHeaders, "qty", "quantity")
        const documentNumberIndex = findColumn(
          normalizedHeaders,
          "document",
          "doc no",
          "number",
        )
        const remarksIndex = findColumn(normalizedHeaders, "remark", "note")

        const items: TransmittalItem[] = rows
          .filter((row) => row.some((cell) => cell?.trim()))
          .map((row, index) => ({
            id: `sheet-${Date.now()}-${index}`,
            qty:
              (quantityIndex >= 0 ? row[quantityIndex]?.trim() : "") || "1",
            noOfItems: "1",
            documentNumber:
              documentNumberIndex >= 0
                ? row[documentNumberIndex]?.trim() || ""
                : "",
            description:
              row[descriptionIndex]?.trim() || `Row ${index + 1}`,
            remarks:
              (remarksIndex >= 0 ? row[remarksIndex]?.trim() : "") ||
              "Via Google Sheet",
            fileType: "link",
          }))

        if (items.length) {
          addItems(items)
          totalAdded = items.length
        }
      } else if (isFolderLink(input)) {
        const folderId = extractFolderIdFromLink(input)
        if (!folderId) {
          statusRef.current("Invalid Drive folder link.", "error")
          return
        }
        statusRef.current("Listing files from folder...", "info")
        const result = await importDriveFiles(
          await listFilesInFolder(folderId, parsedLink.resourceKey),
          "Drive folder import",
        )
        totalAdded = result.addedCount
        driveResult = result
        fallbackCount = result.fallbackCount
        failedCount = result.failedCount || 0
      } else {
        const fileId = extractFileIdFromLink(input)
        if (!fileId) {
          statusRef.current(
            "Please paste a valid Google Drive or Sheets link.",
            "error",
          )
          return
        }
        statusRef.current("Fetching file info...", "info")
        const file = await getFileMetadata(fileId, parsedLink.resourceKey)
        file.resourceKey ||= parsedLink.resourceKey
        const result = await importDriveFiles(
          file.mimeType === "application/vnd.google-apps.folder"
            ? await listFilesInFolder(file.id, file.resourceKey) : [file],
          "Drive link import",
        )
        totalAdded = result.addedCount
        driveResult = result
        fallbackCount = result.fallbackCount
        failedCount = result.failedCount || 0
      }

      if (totalAdded > 0 || driveResult?.skippedCount) {
        if (!failedCount) setSmartInput("")
        statusRef.current(
          describeDriveImport(driveResult || { addedCount: totalAdded, fallbackCount, failedCount }),
          failedCount ? "error" : "info",
        )
      }
    } catch (error) {
      statusRef.current(
        error instanceof Error ? error.message : "Import failed. Check your connection and try again.",
        "error",
      )
    } finally {
      busyRef.current = false
      setIsAnalyzingText(false)
    }
  }, [addItems, importDriveFiles, smartInput])

  return { smartInput, setSmartInput, isAnalyzingText, analyze }
}
