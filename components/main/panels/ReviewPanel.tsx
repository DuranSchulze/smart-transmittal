"use client"

import { Download, FileText, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AppData, WorkspaceSection } from "@/types"
import { PanelHeader } from "./PanelHeader"

type ReviewPanelProps = {
  data: AppData
  onEdit: (section: WorkspaceSection) => void
  onSave: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  isSaving: boolean
  isGeneratingPdf: boolean
  isGeneratingDocx: boolean
}

type SummaryCardProps = {
  title: string
  value: string
  detail?: string
  onEdit: () => void
  incomplete?: boolean
}

function SummaryCard({
  title,
  value,
  detail,
  onEdit,
  incomplete,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-divider bg-white p-3 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-helper">
            {title}
          </p>
          <p className={`mt-1 truncate text-sm font-medium ${incomplete ? "text-amber-600" : "text-graphite"}`}>
            {value}
          </p>
          {detail ? <p className="mt-0.5 truncate text-xs text-helper">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-royal hover:text-royal/80"
        >
          Edit
        </button>
      </div>
    </div>
  )
}

export function ReviewPanel(props: ReviewPanelProps) {
  const recipient = props.data.recipient.to || props.data.recipient.company
  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
      <PanelHeader
        title="Review & export"
        description="Confirm the essentials, save the transmittal, then export or send it."
      />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-2">
          <SummaryCard
            title="Files"
            value={`${props.data.items.length} ${props.data.items.length === 1 ? "document" : "documents"}`}
            detail={props.data.items[0]?.description}
            incomplete={!props.data.items.length}
            onEdit={() => props.onEdit("files")}
          />
          <SummaryCard
            title="Sender"
            value={props.data.sender.agencyName || "Sender not configured"}
            detail={props.data.sender.email}
            incomplete={!props.data.sender.agencyName}
            onEdit={() => props.onEdit("sender")}
          />
          <SummaryCard
            title="Project"
            value={props.data.project.projectName || "Project not configured"}
            detail={props.data.project.transmittalNumber}
            incomplete={!props.data.project.transmittalNumber}
            onEdit={() => props.onEdit("project")}
          />
          <SummaryCard
            title="Recipient"
            value={recipient || "Recipient not configured"}
            detail={props.data.recipient.email}
            incomplete={!recipient}
            onEdit={() => props.onEdit("recipient")}
          />
          <SummaryCard
            title="Sign-off"
            value={props.data.signatories.preparedBy || "Signatory not configured"}
            detail={props.data.signatories.notedBy ? `Noted by ${props.data.signatories.notedBy}` : undefined}
            incomplete={!props.data.signatories.preparedBy}
            onEdit={() => props.onEdit("signoff")}
          />
        </div>

        <div className="rounded-2xl border border-divider bg-wash p-4">
          <p className="text-xs font-medium text-caption">
            Ready when you are
          </p>
          <Button
            onClick={props.onSave}
            disabled={props.isSaving}
            className="mt-3 h-11 w-full rounded-full bg-royal text-white hover:bg-royal/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {props.isSaving ? "Saving…" : "Save transmittal"}
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={props.onExportPdf}
              disabled={props.isGeneratingPdf}
              className="rounded-full border border-royal/60 bg-white text-xs text-royal hover:bg-royal/5"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button
              variant="outline"
              onClick={props.onExportDocx}
              disabled={props.isGeneratingDocx}
              className="rounded-full border border-royal/60 bg-white text-xs text-royal hover:bg-royal/5"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Word
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
