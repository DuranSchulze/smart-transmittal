"use client"

import { useState, type FormEvent } from "react"
import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowDown,
  ArrowUp,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PanelHeader } from "./PanelHeader"
import type { useTransmittalQa } from "@/hooks/useTransmittalQa"
import type { QaRequirement, QaStatus } from "@/lib/transmittal-qa"

type QaController = ReturnType<typeof useTransmittalQa>

const statusColors: Record<QaStatus, string> = {
  Passed: "bg-mint/10 text-green-800",
  "Missing file": "bg-coral/10 text-red-800",
  "Missing keywords": "bg-coral/10 text-red-800",
  "Needs review": "bg-amber-50 text-amber-800",
  "Unable to check": "bg-fog text-caption",
}

const modeLabels: Record<QaRequirement["mode"], string> = {
  exact: "Exact phrase matching",
  semantic: "AI meaning matching",
}

type RequirementEditor = {
  id: string
  isNew: boolean
  name: string
  keywordsText: string
  mode: QaRequirement["mode"]
}

const parseKeywords = (text: string) =>
  Array.from(
    new Set(
      text
        .split("\n")
        .map((value) => value.trim().slice(0, 300))
        .filter(Boolean),
    ),
  ).slice(0, 30)

export function QaPanel({ qa, isImporting }: { qa: QaController; isImporting: boolean }) {
  const disabled = qa.running || isImporting
  const [editor, setEditor] = useState<RequirementEditor | null>(null)

  const move = (index: number, direction: number) => {
    const next = [...qa.requirements]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    qa.updateRequirements(next)
  }

  const openAdd = () =>
    setEditor({
      id: crypto.randomUUID(),
      isNew: true,
      name: "",
      keywordsText: "",
      mode: "exact",
    })

  const openEdit = (requirement: QaRequirement) =>
    setEditor({
      id: requirement.id,
      isNew: false,
      name: requirement.name,
      keywordsText: requirement.keywords.join("\n"),
      mode: requirement.mode,
    })

  const saveEditor = (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const name = editor.name.trim()
    if (!name) return
    const requirement: QaRequirement = {
      id: editor.id,
      name,
      keywords: parseKeywords(editor.keywordsText),
      mode: editor.mode,
    }
    qa.updateRequirements(
      editor.isNew
        ? [...qa.requirements, requirement]
        : qa.requirements.map((r) =>
            r.id === requirement.id ? requirement : r,
          ),
    )
    setEditor(null)
  }

  const unmatched =
    qa.snapshot?.documents.filter(
      (doc) => !doc.error && doc.findings.every((f) => f.filename === "no-match"),
    ) || []
  const failed =
    qa.snapshot?.documents.filter(
      (doc) => doc.error || ["unavailable", "incomplete"].includes(doc.coverage),
    ) || []
  const statuses = Object.keys(statusColors) as QaStatus[]

  return (
    <div>
      <PanelHeader
        eyebrow="Document checklist"
        title="QA"
        description="Check required files and phrases against the documents in this transmittal."
      />
      <div className="space-y-5 p-4 sm:p-6">
        <p className="text-xs leading-relaxed text-helper">
          QA is advisory. Findings never block saving, printing, or exporting.
          Files are sent to your configured AI service only when you run a check.
        </p>
        <section aria-label="Required documents" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">
              Required documents{" "}
              <span className="font-normal text-helper">
                {qa.requirements.length}/100
              </span>
            </h3>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || qa.requirements.length >= 100}
              onClick={openAdd}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {!qa.requirements.length && (
            <div className="rounded-xl border border-dashed border-divider bg-white p-5 text-center">
              <ListChecks className="mx-auto mb-2 h-6 w-6 text-royal" />
              <p className="text-sm font-medium text-ink">
                What should be in this transmittal?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-helper">
                Add a required document, such as “Business permit,” then list
                the phrases it must contain.
              </p>
            </div>
          )}
          {qa.requirements.map((requirement, index) => {
            const row = qa.snapshot
              ? qa.rows.find(
                  (candidate) => candidate.requirement.id === requirement.id,
                )
              : undefined
            const keywordCount = requirement.keywords.length
            return (
              <div
                key={requirement.id}
                className="rounded-xl border border-divider bg-white p-2 shadow-card"
              >
                <button
                  type="button"
                  onClick={() => openEdit(requirement)}
                  disabled={disabled}
                  aria-label={`Edit document ${index + 1}: ${
                    requirement.name || "Untitled document"
                  }`}
                  className="flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-fog/70 focus-visible:outline-2 focus-visible:outline-royal disabled:opacity-60"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wash text-royal">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium text-ink">
                      {requirement.name || "Untitled document"}
                    </span>
                    <span className="mt-0.5 block text-xs text-helper">
                      {keywordCount
                        ? `${keywordCount} required phrase${
                            keywordCount === 1 ? "" : "s"
                          }`
                        : "No required phrases"}{" "}
                      · {modeLabels[requirement.mode]}
                    </span>
                  </span>
                  {row && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusColors[row.status]}`}
                    >
                      {row.status}
                    </span>
                  )}
                  <Pencil className="mt-1 h-3.5 w-3.5 shrink-0 text-helper" />
                </button>
                <div className="flex items-center justify-end gap-1 border-t border-divider px-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Move document ${index + 1} up`}
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Move document ${index + 1} down`}
                    disabled={
                      disabled || index === qa.requirements.length - 1
                    }
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-coral"
                    aria-label={`Delete document ${index + 1}`}
                    disabled={disabled}
                    onClick={() =>
                      qa.updateRequirements(
                        qa.requirements.filter(
                          (r) => r.id !== requirement.id,
                        ),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </section>

        <section
          aria-label="Files available for QA"
          className="rounded-xl border border-divider bg-white p-3"
        >
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Files to check · {qa.documents.length}
          </h3>
          {!qa.documents.length && (
            <p className="text-xs text-helper">
              Import files in the Files tab. You can still run QA to identify
              missing requirements.
            </p>
          )}
          <ul className="divide-y divide-divider">
            {qa.documents.map((doc) => (
              <li key={doc.id} className="py-2 first:pt-0 last:pb-0">
                <p className="break-words text-xs font-medium text-caption">
                  {doc.name}
                </p>
                <p className="mt-0.5 text-xs text-helper">
                  {doc.driveId
                    ? "Downloads from Drive when QA runs"
                    : qa.hasContent(doc.id)
                      ? "Attached for this session"
                      : "Reattach to check content"}
                </p>
                <label className="mt-2 block text-xs text-caption">
                  {qa.hasContent(doc.id) || doc.driveId
                    ? "Replace QA file"
                    : "Attach QA file"}
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    disabled={disabled}
                    aria-label={`Attach QA file for ${doc.name}`}
                    className="mt-1 block w-full text-xs text-helper file:mr-2 file:rounded-md file:border file:border-divider file:bg-fog file:px-2 file:py-1 file:text-xs file:text-caption"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void qa.reattach(doc.id, file)
                      event.target.value = ""
                    }}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-2">
          <Button
            className="w-full"
            disabled={
              disabled ||
              !qa.requirements.length ||
              qa.requirements.some((r) => !r.name.trim())
            }
            onClick={() => void qa.run()}
          >
            {qa.running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking{" "}
                {qa.progress.current}/{qa.progress.total}
              </>
            ) : (
              <>
                <ListChecks className="mr-2 h-4 w-4" /> Run QA
              </>
            )}
          </Button>
          {qa.running && (
            <progress
              aria-label="QA progress"
              max={Math.max(1, qa.progress.total)}
              value={qa.progress.current}
              className="h-1.5 w-full accent-royal"
            />
          )}
          <div aria-live="polite" className="text-xs text-helper">
            {qa.running
              ? "Checking files one at a time…"
              : isImporting
                ? "Wait for file import to finish before running QA."
                : ""}
          </div>
          {qa.error && (
            <p role="alert" className="text-xs leading-relaxed text-red-700">
              {qa.error}
            </p>
          )}
        </div>

        {qa.snapshot && (
          <section aria-label="QA results" className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Results</h3>
            <p className="text-xs text-helper">
              Last checked {new Date(qa.snapshot.checkedAt).toLocaleString()}
            </p>
            {(qa.outdated || qa.previousResults) && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
              >
                {qa.outdated
                  ? "Outdated results: the checklist or files changed. Run QA again."
                  : "Previous results: reattach local files or download Drive files again by running QA."}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5" aria-label="QA summary">
              {statuses.map((status) => (
                <span
                  key={status}
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusColors[status]}`}
                >
                  {status} ·{" "}
                  {qa.rows.filter((r) => r.status === status).length}
                </span>
              ))}
            </div>
            {qa.rows.map((row) => (
              <details
                key={row.requirement.id}
                className="rounded-xl border border-divider bg-white p-3"
              >
                <summary className="cursor-pointer text-xs font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal">
                  <span className="break-words">
                    {row.requirement.name || "Unnamed requirement"}
                  </span>
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-1 text-[11px] ${statusColors[row.status]}`}
                  >
                    {row.status}
                  </span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-helper">
                  {row.explanation}
                </p>
                {row.candidates.map(({ document, finding }) => (
                  <div
                    key={document.documentId}
                    className="mt-3 border-t border-divider pt-3 text-xs"
                  >
                    <p className="break-words font-semibold text-caption">
                      {document.name}
                    </p>
                    <p className="mt-1 text-helper">
                      Filename:{" "}
                      {finding.filename === "match"
                        ? "Matches"
                        : "Needs review"}
                      . {finding.explanation}
                    </p>
                    <p className="mt-1 text-helper">
                      Content:{" "}
                      {document.coverage === "full-text"
                        ? "Full document text checked"
                        : document.coverage === "visual"
                          ? "Visual reading — review evidence"
                          : "Incomplete or unavailable"}
                    </p>
                    {!finding.keywords.length && (
                      <p className="mt-2 text-helper">
                        No required phrases.
                      </p>
                    )}
                    <ul className="mt-2 space-y-2">
                      {finding.keywords.map((keyword) => (
                        <li key={keyword.keyword}>
                          <p className="break-words font-medium text-caption">
                            {keyword.keyword}:{" "}
                            {keyword.status === "found"
                              ? "Found"
                              : keyword.status === "missing"
                                ? "Missing"
                                : "Needs review"}
                            {keyword.page ? ` · page ${keyword.page}` : ""}
                          </p>
                          {keyword.evidence && (
                            <blockquote className="mt-1 break-words border-l-2 border-royal/30 pl-2 leading-relaxed text-helper">
                              “{keyword.evidence}”
                            </blockquote>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </details>
            ))}
            {!!failed.length && (
              <div className="rounded-xl border border-divider bg-white p-3">
                <h4 className="text-xs font-semibold text-caption">
                  Files needing another check
                </h4>
                {failed.map((doc) => (
                  <p
                    key={doc.documentId}
                    className="mt-2 break-words text-xs text-helper"
                  >
                    <strong>{doc.name}</strong>:{" "}
                    {doc.error || "Incomplete document coverage."}
                  </p>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={disabled || qa.outdated || !qa.requirements.length}
                  onClick={() => void qa.run(true)}
                >
                  Retry failed checks
                </Button>
              </div>
            )}
            {!!unmatched.length && (
              <div className="rounded-xl border border-divider bg-white p-3">
                <h4 className="text-xs font-semibold text-caption">
                  Other files · {unmatched.length}
                </h4>
                <p className="mt-1 text-xs text-helper">
                  These files did not match a requirement. They are not QA
                  failures.
                </p>
                <ul className="mt-2 space-y-1 text-xs text-caption">
                  {unmatched.map((doc) => (
                    <li key={doc.documentId} className="break-words">
                      {doc.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>

      <Dialog.Root
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[100] bg-ink/30 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-divider bg-white p-6 shadow-xl outline-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold text-ink">
                  {editor?.isNew
                    ? "Add required document"
                    : "Edit required document"}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-relaxed text-helper">
                  Name the document QA should look for, then list the phrases
                  it must contain.
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close dialog"
                    className="shrink-0"
                  />
                }
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {editor && (
              <form className="mt-5 space-y-4" onSubmit={saveEditor}>
                <label className="block text-xs text-caption">
                  Expected document name
                  <Input
                    className="mt-1 h-9 bg-white text-sm"
                    value={editor.name}
                    maxLength={500}
                    placeholder="e.g. Business permit"
                    disabled={disabled}
                    onChange={(event) =>
                      setEditor((current) =>
                        current
                          ? { ...current, name: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="block text-xs text-caption">
                  Required phrases{" "}
                  <span className="text-helper">
                    (optional, one per line, up to 30)
                  </span>
                  <textarea
                    aria-label={`Required phrases for ${
                      editor.name.trim() || "new requirement"
                    }`}
                    value={editor.keywordsText}
                    rows={4}
                    maxLength={9000}
                    disabled={disabled}
                    onChange={(event) =>
                      setEditor((current) =>
                        current
                          ? { ...current, keywordsText: event.target.value }
                          : current,
                      )
                    }
                    className="mt-1 w-full resize-y rounded-lg border border-divider bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal disabled:opacity-60"
                  />
                </label>
                <label className="block text-xs text-caption">
                  Phrase matching
                  <select
                    className="mt-1 h-9 w-full rounded-lg border border-divider bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal"
                    disabled={disabled}
                    value={editor.mode}
                    onChange={(event) =>
                      setEditor((current) =>
                        current
                          ? {
                              ...current,
                              mode: event.target.value as QaRequirement["mode"],
                            }
                          : current,
                      )
                    }
                  >
                    <option value="exact">
                      Exact phrases · ignore case and spacing
                    </option>
                    <option value="semantic">
                      AI meaning · accept equivalent wording
                    </option>
                  </select>
                </label>
                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full text-xs"
                    onClick={() => setEditor(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full text-xs"
                    disabled={!editor.name.trim()}
                  >
                    {editor.isNew ? "Add document" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
