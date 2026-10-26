"use client"

import { useState, type DragEvent } from "react"
import { HardDrive, Link2, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { TransmittalItem } from "@/types"
import { PanelHeader } from "./PanelHeader"

type FilesPanelProps = {
  items: TransmittalItem[]
  smartInput: string
  onSmartInputChange: (value: string) => void
  isAnalyzingText: boolean
  onSmartAnalysis: () => void
  isParsing: boolean
  parseProgress: { current: number; total: number }
  isDocumentProcessing: boolean
  onOpenUploadModal: () => void
  onDropFiles: (files: File[]) => void
  isDriveReady: boolean
  onOpenDriveModal: () => void
  onAddManualItem: () => void
}

export function FilesPanel(props: FilesPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return
    event.preventDefault()
    event.dataTransfer.dropEffect = props.isDocumentProcessing ? "none" : "copy"
    if (!props.isDocumentProcessing) setIsDragging(true)
  }

  const importFromLink = () => {
    if (props.smartInput.trim() && !props.isDocumentProcessing) props.onSmartAnalysis()
  }

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
      <PanelHeader
        eyebrow="Primary workspace"
        title="Files"
        description="Import, organize, and reopen every document connected to this transmittal."
        action={
          <span className="shrink-0 whitespace-nowrap rounded-full border border-royal/15 bg-wash px-2.5 py-1 text-xs font-medium tabular-nums text-royal">
            {props.items.length} {props.items.length === 1 ? "file" : "files"}
          </span>
        }
      />

      <div className="space-y-5 p-6">
        <section className="rounded-2xl border border-divider bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-caption">Quick import</h3>
              <p className="mt-0.5 text-xs text-helper">
                Google Drive, Sheets, folders, PDFs, and Word files
              </p>
            </div>
            {props.isParsing ? (
              <span className="text-xs font-medium text-royal">
                {props.parseProgress.current}/{props.parseProgress.total}
              </span>
            ) : null}
          </div>

          <div className="relative" data-tour="smart-input">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-helper" />
            <Input
              disabled={props.isDocumentProcessing}
              value={props.smartInput}
              onChange={(event) => props.onSmartInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  importFromLink()
                }
              }}
              placeholder="Paste a Drive or Sheets link"
              className="h-11 rounded-xl bg-fog pl-10 pr-20 text-xs"
            />
            <Button
              data-tour="upload-files"
              size="sm"
              onClick={importFromLink}
              disabled={!props.smartInput.trim() || props.isDocumentProcessing}
              className="absolute right-1.5 top-1.5 h-8 rounded-full px-3.5 text-xs"
            >
              {props.isAnalyzingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Import"}
            </Button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              if (props.isDocumentProcessing) return
              const files = Array.from(event.dataTransfer.files)
              if (files.length) props.onDropFiles(files)
            }}
            aria-busy={props.isDocumentProcessing}
            className={`mt-4 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-150 motion-reduce:transition-none ${
              props.isDocumentProcessing
                ? "border-divider bg-fog"
                : isDragging
                  ? "border-royal bg-wash ring-4 ring-royal/10"
                  : "border-royal/30 bg-wash/50 hover:border-royal/60"
            }`}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-royal/15 bg-white text-royal">
              {props.isDocumentProcessing ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <Upload aria-hidden="true" className="h-5 w-5" />}
            </div>
            <p className="text-sm font-semibold text-ink" role="status">
              {props.isDocumentProcessing ? "Processing documents…" : isDragging ? "Drop files to add them" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-xs leading-5 text-caption">
              {props.isDocumentProcessing ? "You can add more files when processing finishes." : "Add one or more documents from your computer."}
            </p>
            <Button
              data-tour="browse-drive"
              variant="outline"
              onClick={props.onOpenUploadModal}
              disabled={props.isDocumentProcessing}
              className="mt-3 h-9 rounded-full bg-white px-4 text-xs font-medium"
            >
              Or browse files
            </Button>
            <p className="mt-3 text-xs text-helper">PDF and Word (.doc, .docx)</p>
          </div>

          <Button
            variant="outline"
            onClick={props.onOpenDriveModal}
            disabled={props.isDocumentProcessing}
            className="mt-3 h-10 w-full rounded-full text-xs font-medium"
          >
            <HardDrive className="mr-2 h-4 w-4" /> Browse Google Drive
          </Button>
        </section>

        {!props.items.length ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onAddManualItem}
            className="w-full rounded-full text-xs text-helper"
          >
            Or add a blank item to the current transmittal
          </Button>
        ) : null}
      </div>
    </div>
  )
}
