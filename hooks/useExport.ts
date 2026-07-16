"use client"

import { useCallback, useRef, useState } from "react"
import * as mammoth from "mammoth"
import type { AppData } from "../types"
import type { ExportFormat } from "../components/modals/ExportChoiceModal"
import { generateTransmittalDocx } from "../services/docxGenerator"
import { uploadFileToDrive } from "../services/googleDriveService"
import { friendlyError } from "../lib/friendlyError"
import { createCsv } from "../lib/csv"
import { createExportFileName } from "../lib/export-file"

type StatusType = "info" | "error"

type UseExportOptions = {
  data: AppData
  onStatus: (message: string, type: StatusType) => void
}

type PdfDocument = {
  internal: {
    getNumberOfPages: () => number
    pageSize: { getWidth: () => number; getHeight: () => number }
  }
  setPage: (page: number) => void
  setFontSize: (size: number) => void
  setTextColor: (color: number) => void
  text: (text: string, x: number, y: number) => void
}

const timestamp = () =>
  new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "")

const localDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

const waitForExportLayout = async () => {
  if (document.fonts?.ready) await document.fonts.ready
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => resolve()),
    ),
  )
}

const assertGeneratedBlob = (blob: unknown, format: string): Blob => {
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error(`${format} generator returned an empty file.`)
  }
  return blob
}

export function useExport({ data, onStatus }: UseExportOptions) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [docxPreviewHtml, setDocxPreviewHtml] = useState("")
  const [exportChoiceOpen, setExportChoiceOpen] = useState(false)
  const [exportFolderPickerOpen, setExportFolderPickerOpen] = useState(false)
  const [pendingExportBlob, setPendingExportBlob] = useState<Blob | null>(null)
  const [pendingExportFormat, setPendingExportFormat] =
    useState<ExportFormat>("pdf")
  const [pendingExportFileName, setPendingExportFileName] = useState("")
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false)
  const statusRef = useRef(onStatus)
  statusRef.current = onStatus

  const showChoice = useCallback(
    (blob: Blob, format: ExportFormat, fileName: string) => {
      setPendingExportBlob(blob)
      setPendingExportFormat(format)
      setPendingExportFileName(fileName)
      setExportChoiceOpen(true)
    },
    [],
  )

  const closeChoice = useCallback(() => {
    setExportChoiceOpen(false)
    setPendingExportBlob(null)
  }, [])

  const downloadLocal = useCallback(() => {
    if (pendingExportBlob) {
      localDownload(pendingExportBlob, pendingExportFileName)
    }
    closeChoice()
  }, [closeChoice, pendingExportBlob, pendingExportFileName])

  const uploadToDrive = useCallback(() => {
    setExportChoiceOpen(false)
    setExportFolderPickerOpen(true)
  }, [])

  const closeFolderPicker = useCallback(() => {
    setExportFolderPickerOpen(false)
    setPendingExportBlob(null)
  }, [])

  const selectFolder = useCallback(
    async (folderId: string, folderName: string) => {
      if (!pendingExportBlob) return
      setExportFolderPickerOpen(false)
      setIsUploadingToDrive(true)
      statusRef.current("Uploading to Google Drive...", "info")
      try {
        const result = await uploadFileToDrive(
          pendingExportBlob,
          pendingExportFileName,
          folderId,
        )
        statusRef.current(`Uploaded to Drive: ${folderName}`, "info")
        if (result.webViewLink) window.open(result.webViewLink, "_blank")
      } catch (error) {
        statusRef.current(
          friendlyError(error, "Couldn't upload the file to Google Drive."),
          "error",
        )
      } finally {
        setIsUploadingToDrive(false)
        setPendingExportBlob(null)
      }
    },
    [pendingExportBlob, pendingExportFileName],
  )

  const exportPdf = useCallback(async () => {
    if (isGeneratingPdf) return
    setIsGeneratingPdf(true)
    let previewWrapper: HTMLElement | null = null
    let previousTransform = ""
    try {
      await waitForExportLayout()
      const element = document.getElementById("print-container")
      if (!element) throw new Error("Printable document is not available.")

      previewWrapper = element.parentElement
      if (previewWrapper) {
        previousTransform = previewWrapper.style.transform
        previewWrapper.style.transform = "none"
      }

      const { default: html2pdf } = await import("html2pdf.js")
      const fileName = createExportFileName(
        data.project.transmittalNumber,
        `_${timestamp()}`,
        "pdf",
      )
      const worker = html2pdf()
        .from(element)
        .set({
          margin: 0.5,
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .toPdf()

      await worker.get("pdf").then((value: unknown) => {
        const pdf = value as PdfDocument
        const totalPages = pdf.internal.getNumberOfPages()
        for (let page = 1; page <= totalPages; page += 1) {
          pdf.setPage(page)
          pdf.setFontSize(8)
          pdf.setTextColor(150)
          pdf.text(
            `Page ${page} of ${totalPages}`,
            pdf.internal.pageSize.getWidth() - 1.25,
            pdf.internal.pageSize.getHeight() - 0.35,
          )
        }
      })
      showChoice(
        assertGeneratedBlob(await worker.outputPdf("blob"), "PDF"),
        "pdf",
        fileName,
      )
    } catch (error) {
      statusRef.current(friendlyError(error, "Couldn't generate the PDF."), "error")
    } finally {
      if (previewWrapper) previewWrapper.style.transform = previousTransform
      setIsGeneratingPdf(false)
    }
  }, [data.project.transmittalNumber, isGeneratingPdf, showChoice])

  const exportDocx = useCallback(async () => {
    if (isGeneratingDocx) return
    setIsGeneratingDocx(true)
    try {
      const blob = assertGeneratedBlob(
        await generateTransmittalDocx(data),
        "DOCX",
      )
      showChoice(
        blob,
        "docx",
        createExportFileName(
          data.project.transmittalNumber,
          `_${timestamp()}`,
          "docx",
        ),
      )
    } catch (error) {
      statusRef.current(friendlyError(error, "Couldn't generate the DOCX."), "error")
    } finally {
      setIsGeneratingDocx(false)
    }
  }, [data, isGeneratingDocx, showChoice])

  const previewDocx = useCallback(async () => {
    setDocxPreviewHtml("")
    setIsPreviewModalOpen(true)
    try {
      const blob = await generateTransmittalDocx(data)
      const result = await mammoth.convertToHtml({
        arrayBuffer: await blob.arrayBuffer(),
      })
      setDocxPreviewHtml(result.value)
    } catch (error) {
      setIsPreviewModalOpen(false)
      statusRef.current(friendlyError(error, "Couldn't preview the DOCX."), "error")
    }
  }, [data])

  const exportCsv = useCallback(() => {
    const csv = createCsv([
      ["No.", "QTY", "Document Number", "Description", "Remarks"],
      ...data.items.map((item) => [
        item.noOfItems,
        item.qty,
        item.documentNumber,
        item.description,
        item.remarks,
      ]),
    ])
    showChoice(
      assertGeneratedBlob(
        new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
        "CSV",
      ),
      "csv",
      createExportFileName(data.project.transmittalNumber, "_items", "csv"),
    )
  }, [data.items, data.project.transmittalNumber, showChoice])

  return {
    isGeneratingPdf,
    isGeneratingDocx,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    docxPreviewHtml,
    exportChoiceOpen,
    pendingExportFormat,
    pendingExportFileName,
    isUploadingToDrive,
    exportFolderPickerOpen,
    exportPdf,
    exportDocx,
    previewDocx,
    exportCsv,
    downloadLocal,
    uploadToDrive,
    closeChoice,
    closeFolderPicker,
    selectFolder,
  }
}
