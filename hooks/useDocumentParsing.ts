"use client"

import { useEffect, useRef } from "react"
import type { TransmittalItem } from "../types"
import type { ParseResult } from "../services/geminiService"
import { resolveDocumentNumberWithFallback } from "../services/geminiService"
import { parseDocument } from "../services/parse-api"
import { useFileProcessing } from "./useFileProcessing"
import { needsReview, reasonCopy, reasonFromClientError, reviewNote, type ParseReason, type ReadMethod } from "../lib/parse-reasons"

import type { DocumentReference, QaDocumentContent } from "../lib/transmittal-qa"

type ParsedFileResult = {
  items: TransmittalItem[]
  header?: ParseResult["header"]
  usedFallback: boolean
  fileName?: string
  readMethod?: ReadMethod
  reason?: ParseReason
  personalKeyUnusable?: boolean
}

type UseDocumentParsingOptions = {
  apiBaseUrl: string
  getDocumentSession?: () => number
  onDocumentReady?: (document: DocumentReference, content: QaDocumentContent) => void
  addItems: (items: TransmittalItem[]) => void
  mergeHeader: (header: ParseResult["header"]) => void
  onStatus: (message: string, type: "info" | "error") => void
}

const stripExtension = (fileName: string) =>
  fileName.replace(/\.[^/.]+$/, "").trim()

export function useDocumentParsing({
  apiBaseUrl,
  onDocumentReady,
  getDocumentSession,
  addItems,
  mergeHeader,
  onStatus,
}: UseDocumentParsingOptions) {
  const batchSessionRef = useRef<number | undefined>(undefined)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const {
    processFiles,
    isProcessing,
    progress,
    error,
  } = useFileProcessing<ParsedFileResult>(
    async (base64, mimeType, fileName, textComplete) => {
      const session = batchSessionRef.current
      if (getDocumentSession?.() !== session) return { items: [], usedFallback: false }
      let result: ParseResult
      try {
        result = await parseDocument(
          {
            content: base64,
            mimeType,
            isText: mimeType === "text/plain",
            fileName,
            flow: "upload",
          },
          apiBaseUrl,
        )
      } catch (error) {
        // A failed request still gets a named row with its reason (REQ-2), not a silent drop.
        const reason = reasonFromClientError(error)
        const copy = reasonCopy(reason)
        result = { parser: "fallback", readMethod: "none", reason, error: copy, fallbackCount: 1,
          items: [{ description: stripExtension(fileName) || fileName, documentNumber: "", qty: "1", remarks: copy, documentType: "File" }] }
      }
      if (getDocumentSession?.() !== session) return { items: [], usedFallback: false }
      const hasItems = result.items.length > 0
      const usedFallback = Boolean(result.error) || (result.fallbackCount || 0) > 0
      if (result.error && !hasItems) throw new Error(result.error)

      if (!hasItems) return { items: [], usedFallback }
      const readMethod: ReadMethod = result.readMethod || (result.parser === "fallback" ? "none" : "text")
      const extraction = { readMethod, ...(result.reason ? { reason: result.reason } : {}) }
      const document: DocumentReference = { id: crypto.randomUUID(), name: fileName, mimeType, revision: crypto.randomUUID() }
      onDocumentReady?.(document, { content: base64, mimeType, isText: mimeType === "text/plain", textComplete })
      return {
        items: result.items.map((item, index) => ({
          id: `upload-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          qty: item.qty || "1",
          noOfItems: "1",
          documentNumber: resolveDocumentNumberWithFallback({
            currentDocumentNumber: item.documentNumber,
            sourceName: fileName,
            description:
              item.description || stripExtension(fileName || "") || fileName,
            documentType: item.documentType || "File",
            unreadable: readMethod === "none",
          }),
          description: item.description,
          remarks: item.remarks || "",
          fileType: "upload" as const,
          fileSource: fileName,
          document,
          extraction,
        })),
        header: result.header,
        usedFallback,
        fileName,
        readMethod,
        reason: result.reason,
        personalKeyUnusable: result.personalKeyStatus === "unusable",
      }
    },
    [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
  )

  useEffect(() => {
    if (error) statusRef.current("File processing failed.", "error")
  }, [error])

  const processUploadedFiles = async (files: File[]) => {
    if (!files.length) return
    const session = getDocumentSession?.()
    batchSessionRef.current = session
    const results = await processFiles(files, (result) => {
      if (getDocumentSession?.() !== session) return
      addItems(result.items)
      if (result.header) mergeHeader(result.header)
    })

    if (getDocumentSession?.() !== session) return
    if (!results.length) {
      statusRef.current(
        "Couldn't process the uploaded file(s). Check your AI key settings or try a different file.",
        "error",
      )
      return
    }

    const addedCount = results.reduce(
      (total, result) => total + result.items.length,
      0,
    )
    if (!addedCount) {
      statusRef.current(
        "No items were found in the uploaded file(s). The document may not contain recognizable content.",
        "error",
      )
      return
    }

    // Name each file that needs review and why, instead of an aggregate fallback count.
    const review = results
      .filter(result => result.items.length && needsReview(result.readMethod, result.reason))
      .map(result => `${result.fileName} (${reviewNote(result.readMethod, result.reason)})`)
    const keyNotice = results.some(result => result.personalKeyUnusable)
      ? " Your personal AI key could not be used, so the shared key was used. Re-enter it in account settings."
      : ""
    statusRef.current(
      review.length
        ? `Imported ${addedCount} item(s) from ${results.length} uploaded file(s). Needs review: ${review.join("; ")}.${keyNotice}`
        : `Imported ${addedCount} item(s) from ${results.length} uploaded file(s) from document text.${keyNotice}`,
      "info",
    )
  }

  return {
    processUploadedFiles,
    isParsing: isProcessing,
    parseProgress: progress,
    processingError: error,
  }
}
