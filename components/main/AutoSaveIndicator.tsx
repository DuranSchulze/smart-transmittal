"use client"

import {
  Cloud,
  CloudCheck,
  CloudUpload,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

type AutoSaveIndicatorProps = {
  hasUnsavedChanges: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  saveError: string | null
  isDraft: boolean
  onRetry: () => void
}

export function AutoSaveIndicator({
  hasUnsavedChanges,
  isSaving,
  lastSavedAt,
  saveError,
  isDraft,
  onRetry,
}: AutoSaveIndicatorProps) {
  const savedTime = lastSavedAt?.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  if (saveError) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-red-700 shadow-sm"
        role="alert"
        title={saveError}
      >
        <TriangleAlert className="h-4 w-4 shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-bold">Autosave failed</p>
          <p className="hidden truncate text-[9px] text-red-600 md:block">
            Changes are not saved to cloud
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-red-600 px-2 text-[10px] font-bold text-white transition-colors hover:bg-red-700"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  if (isSaving) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 shadow-sm"
        role="status"
        aria-live="polite"
        title="Your latest changes are being saved to the cloud."
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-bold">Saving draft…</p>
          <p className="hidden truncate text-[9px] text-blue-600 md:block">
            Keep this window open
          </p>
        </div>
      </div>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 shadow-sm"
        role="status"
        aria-live="polite"
        title="Autosave is waiting briefly for you to finish editing."
      >
        <CloudUpload className="h-4 w-4 shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-bold">Changes pending</p>
          <p className="hidden truncate text-[9px] text-amber-600 md:block">
            Autosaving in a moment
          </p>
        </div>
      </div>
    )
  }

  if (lastSavedAt) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm"
        role="status"
        aria-live="polite"
        title={`Latest changes saved automatically at ${savedTime}.`}
      >
        <CloudCheck className="h-4 w-4 shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[11px] font-bold">Saved automatically</p>
          <p className="hidden truncate text-[9px] text-emerald-600 md:block">
            {isDraft ? "Draft saved" : "Saved"} at {savedTime}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600"
      role="status"
      title="Autosave starts when you enter transmittal data."
    >
      <Cloud className="h-4 w-4 shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] font-bold">Autosave ready</p>
        <p className="hidden truncate text-[9px] text-slate-500 md:block">
          Changes will save as a draft
        </p>
      </div>
    </div>
  )
}
