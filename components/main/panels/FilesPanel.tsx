"use client"

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
  isDriveReady: boolean
  onOpenDriveModal: () => void
  onAddManualItem: () => void
}

export function FilesPanel(props: FilesPanelProps) {
  const importFromLink = () => {
    if (props.smartInput.trim() && !props.isAnalyzingText) props.onSmartAnalysis()
  }

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
      <PanelHeader
        eyebrow="Primary workspace"
        title="Files"
        description="Import, organize, and reopen every document connected to this transmittal."
        action={
          <span className="rounded-full bg-wash px-2.5 py-1 text-xs font-medium text-royal">
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
                Google Drive, Sheets, folders, PDFs, Word files, and images
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
              disabled={!props.smartInput.trim() || props.isAnalyzingText}
              className="absolute right-1.5 top-1.5 h-8 rounded-full px-3.5 text-xs"
            >
              {props.isAnalyzingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Import"}
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              data-tour="browse-drive"
              variant="outline"
              onClick={props.onOpenUploadModal}
              disabled={props.isDocumentProcessing}
              className="h-10 rounded-full text-xs font-medium"
            >
              <Upload className="mr-2 h-4 w-4" /> Upload files
            </Button>
            <Button
              variant="outline"
              onClick={props.onOpenDriveModal}
              disabled={!props.isDriveReady || props.isDocumentProcessing}
              className="h-10 rounded-full text-xs font-medium"
            >
              <HardDrive className="mr-2 h-4 w-4" /> Browse Drive
            </Button>
          </div>
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
