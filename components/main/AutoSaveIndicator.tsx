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
        className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-divider bg-white px-3 py-1.5 text-caption shadow-sm"
        role="alert"
        title={saveError}
      >
        <TriangleAlert className="h-4 w-4 shrink-0 text-coral" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-medium">Autosave failed</p>
          <p className="hidden truncate text-xs text-helper md:block">
            Changes are not saved to cloud
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-coral px-2.5 text-xs font-medium text-white transition-colors hover:bg-coral/90"
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
        className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-divider bg-white px-3 py-1.5 text-caption shadow-sm"
        role="status"
        aria-live="polite"
        title="Your latest changes are being saved to the cloud."
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-royal" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-medium">Saving draft…</p>
          <p className="hidden truncate text-xs text-helper md:block">
            Keep this window open
          </p>
        </div>
      </div>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-divider bg-white px-3 py-1.5 text-caption shadow-sm"
        role="status"
        aria-live="polite"
        title="Autosave is waiting briefly for you to finish editing."
      >
        <CloudUpload className="h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-medium">Changes pending</p>
          <p className="hidden truncate text-xs text-helper md:block">
            Autosaving in a moment
          </p>
        </div>
      </div>
    )
  }

  if (lastSavedAt) {
    return (
      <div
        className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-divider bg-white px-3 py-1.5 text-caption shadow-sm"
        role="status"
        aria-live="polite"
        title={`Latest changes saved automatically at ${savedTime}.`}
      >
        <CloudCheck className="h-4 w-4 shrink-0 text-mint" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-medium">Saved automatically</p>
          <p className="hidden truncate text-xs text-helper md:block">
            {isDraft ? "Draft saved" : "Saved"} at {savedTime}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="ml-auto flex min-w-0 items-center gap-2 rounded-full border border-divider bg-white px-3 py-1.5 text-caption"
      role="status"
      title="Autosave starts when you enter transmittal data."
    >
      <Cloud className="h-4 w-4 shrink-0 text-helper" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-medium">Autosave ready</p>
        <p className="hidden truncate text-xs text-helper md:block">
          Changes will save as a draft
        </p>
      </div>
    </div>
  )
}
