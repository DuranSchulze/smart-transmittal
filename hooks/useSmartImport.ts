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
import { friendlyError } from "../lib/friendlyError"

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
  isDriveReady,
  addItems,
  importDriveFiles,
  onStatus,
}: UseSmartImportOptions) {
  const [smartInput, setSmartInput] = useState("")
  const [isAnalyzingText, setIsAnalyzingText] = useState(false)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const analyze = useCallback(async () => {
    const input = smartInput.trim()
    if (!input || isAnalyzingText) return

    setIsAnalyzingText(true)
    statusRef.current("Analyzing link...", "info")
    try {
      if (!isDriveReady) {
        statusRef.current(
          "Drive access not available. Please sign in again.",
          "error",
        )
        return
      }

      let totalAdded = 0
      let fallbackCount = 0

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
          await listFilesInFolder(folderId),
          "Drive folder import",
        )
        totalAdded = result.addedCount
        fallbackCount = result.fallbackCount
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
        const result = await importDriveFiles(
          [await getFileMetadata(fileId)],
          "Drive file import",
        )
        totalAdded = result.addedCount
        fallbackCount = result.fallbackCount
      }

      if (totalAdded > 0) {
        setSmartInput("")
        statusRef.current(
          fallbackCount > 0
            ? `Imported ${totalAdded} item(s). Document # fallback was used for ${fallbackCount} file(s).`
            : `Imported ${totalAdded} item(s) using AI extraction.`,
          "info",
        )
      }
    } catch (error) {
      statusRef.current(
        friendlyError(
          error,
          "Smart analysis failed. Check your Drive connection and try again.",
        ),
        "error",
      )
    } finally {
      setIsAnalyzingText(false)
    }
  }, [addItems, importDriveFiles, isAnalyzingText, isDriveReady, smartInput])

  return { smartInput, setSmartInput, isAnalyzingText, analyze }
}
