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
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className={`mt-1 truncate text-xs font-semibold ${incomplete ? "text-amber-600" : "text-slate-800"}`}>
            {value}
          </p>
          {detail ? <p className="mt-0.5 truncate text-[10px] text-slate-400">{detail}</p> : null}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[10px] font-bold text-brand-600 hover:text-brand-700"
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

        <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl shadow-slate-900/10">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Ready when you are
          </p>
          <Button
            onClick={props.onSave}
            disabled={props.isSaving}
            className="mt-3 h-11 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100"
          >
            <Save className="mr-2 h-4 w-4" />
            {props.isSaving ? "Saving…" : "Save transmittal"}
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={props.onExportPdf}
              disabled={props.isGeneratingPdf}
              className="border-white/15 bg-white/5 text-[10px] text-white hover:bg-white/10 hover:text-white"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
            </Button>
            <Button
              variant="outline"
              onClick={props.onExportDocx}
              disabled={props.isGeneratingDocx}
              className="border-white/15 bg-white/5 text-[10px] text-white hover:bg-white/10 hover:text-white"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Word
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
