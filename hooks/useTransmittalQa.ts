"use client"

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { AppData } from "../types"
import {
  aggregateQa, qaInputKey, qaDocuments, QaDocumentResultSchema, QaRequirementSchema,
  type DocumentReference, type QaDocumentContent, type QaDocumentResult, type QaRequirement,
} from "../lib/transmittal-qa"
import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "../services/api-url"
import { getFileContentAsBase64, getFileMetadata } from "../services/googleDriveService"
import { prepareQaContent, readQaFile } from "../services/qa-document-content"

export function useTransmittalQa(data: AppData, setData: Dispatch<SetStateAction<AppData>>, apiBaseUrl: string) {
  const registry = useRef(new Map<string, QaDocumentContent>())
  const epoch = useRef(0)
  const busy = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const latest = useRef(data)
  latest.current = data
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState("")
  const [currentSnapshot, setCurrentSnapshot] = useState<object | null>(null)
  const [, refreshRegistry] = useState(0)

  const resetSession = useCallback(() => {
    epoch.current += 1
    controller.current?.abort()
    controller.current = null
    registry.current.clear()
    busy.current = false
    setRunning(false)
    setProgress({ current: 0, total: 0 })
    setError("")
    setCurrentSnapshot(null)
  }, [])

  useEffect(() => () => { epoch.current++; controller.current?.abort(); registry.current.clear() }, [])
  useEffect(() => {
    const ids = new Set(data.items.flatMap(item => item.document ? [item.document.id] : []))
    for (const id of registry.current.keys()) if (!ids.has(id)) registry.current.delete(id)
  }, [data.items])

  const registerDocument = useCallback((document: DocumentReference, content: QaDocumentContent) => {
    registry.current.set(document.id, content)
    refreshRegistry(value => value + 1)
  }, [])

  const updateRequirements = (requirements: QaRequirement[]) => {
    setData(previous => ({ ...previous, qa: { ...previous.qa, requirements } }))
  }

  const reattach = async (documentId: string, file: File) => {
    const session = epoch.current
    setError("")
    try {
      const content = await readQaFile(file)
      if (session !== epoch.current) return
      const items = latest.current.items
      const existing = qaDocuments(items).find(doc => doc.id === documentId)
      if (!existing) return
      const document: DocumentReference = { id: existing.id, name: file.name, mimeType: content.mimeType, revision: crypto.randomUUID() }
      // Explicitly choosing a replacement detaches any old Drive source for QA.
      registry.current.set(document.id, content)
      setData(previous => ({ ...previous, items: previous.items.map(item =>
        (item.document?.id || `item:${item.id}`) === documentId ? { ...item, document } : item) }))
    } catch (cause) { if (session === epoch.current) setError(cause instanceof Error ? cause.message : "Could not attach this file.") }
  }

  const getSessionToken = useCallback(() => epoch.current, [])
  const key = qaInputKey(data)
  useEffect(() => { controller.current?.abort() }, [key])
  const snapshot = data.qa?.snapshot
  const outdated = Boolean(snapshot && snapshot.inputKey !== key)
  const previousResults = Boolean(snapshot && currentSnapshot !== snapshot)
  const rows = aggregateQa(data.qa?.requirements || [], snapshot?.documents || [])
  const documents = qaDocuments(data.items)

  const run = async (retryFailed = false) => {
    if (busy.current) return
    const source = latest.current
    const requirements = source.qa?.requirements || []
    if (!requirements.length || requirements.some(r => !QaRequirementSchema.safeParse(r).success)) {
      setError("Each requirement needs a document name and up to 30 phrases, with at most 300 characters per phrase.")
      return
    }
    const session = epoch.current
    const inputKey = qaInputKey(source)
    const refs = qaDocuments(source.items)
    if (refs.length > 200 || inputKey.length > 300_000) {
      setError("This transmittal is too large for one QA run (maximum 200 files). Split it into smaller transmittals.")
      return
    }
    const requestController = new AbortController()
    controller.current = requestController
    busy.current = true
    setRunning(true)
    setError("")
    const results: QaDocumentResult[] = []
    const canReuse = retryFailed && currentSnapshot === source.qa?.snapshot && source.qa?.snapshot?.inputKey === inputKey
    const queued = refs.filter(doc => {
      const result = canReuse ? source.qa?.snapshot?.documents.find(d => d.documentId === doc.id && !d.error && !["unavailable", "incomplete"].includes(d.coverage)) : undefined
      if (result) results.push(result)
      return !result
    })
    setProgress({ current: 0, total: queued.length })
    const isCurrent = () => session === epoch.current && qaInputKey(latest.current) === inputKey
    try {
      for (let index = 0; index < queued.length; index++) {
        const doc = queued[index]
        if (!isCurrent()) break
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
          // Drive must be downloaded afresh on every full run; cached bytes may be stale.
          let payload = registry.current.get(doc.id)
          if (doc.driveId) {
            const metadata = await getFileMetadata(doc.driveId, doc.resourceKey)
            if (metadata.name !== doc.name) throw new Error("This Drive file was renamed. Re-import it or reattach the current document before checking.")
            const downloaded = await getFileContentAsBase64(doc.driveId, metadata.mimeType, doc.resourceKey)
            payload = await prepareQaContent(downloaded.base64, downloaded.mimeType, metadata.name)
          }
          if (!payload) throw new Error("File content is unavailable. Reattach a PDF or Word document to this item.")
          if (!isCurrent()) break
          const perFile = new AbortController()
          const abort = () => perFile.abort()
          requestController.signal.addEventListener("abort", abort, { once: true })
          timer = setTimeout(() => perFile.abort(), 90_000)
          try {
            const response = await apiFetch<unknown>(resolveApiUrl("/api/transmittal-qa", apiBaseUrl), apiJsonOptions("POST", {
              document: { ...doc, mimeType: payload.mimeType }, content: payload.content, isText: payload.isText, textComplete: payload.textComplete, requirements,
            }, { signal: perFile.signal }))
            const result = QaDocumentResultSchema.parse(response)
            if (result.documentId !== doc.id || result.name !== doc.name || result.findings.length !== requirements.length ||
              new Set(result.findings.map(f => f.requirementId)).size !== requirements.length ||
              result.findings.some(f => !requirements.some(r => r.id === f.requirementId))) throw new Error("Incomplete QA response. Retry this file.")
            results.push(result)
          } finally { requestController.signal.removeEventListener("abort", abort) }
        } catch (cause) {
          results.push({ documentId: doc.id, name: doc.name, coverage: "unavailable", findings: [],
            error: cause instanceof Error ? cause.message.slice(0, 1000) : "Document check failed. Retry this file." })
        } finally { if (timer) clearTimeout(timer) }
        if (!isCurrent()) break
        setProgress({ current: index + 1, total: queued.length })
      }
      if (!isCurrent()) {
        if (session === epoch.current) setError("The checklist or files changed during QA. Run QA again to check the current version.")
        return
      }
      const result = { checkedAt: new Date().toISOString(), inputKey, documents: results }
      setData(previous => qaInputKey(previous) === inputKey ? { ...previous, qa: { requirements, snapshot: result } } : previous)
      setCurrentSnapshot(result)
    } finally {
      if (session === epoch.current) { busy.current = false; setRunning(false); controller.current = null }
    }
  }

  return {
    requirements: data.qa?.requirements || [], updateRequirements, registerDocument, resetSession, getSessionToken,
    documents, reattach, run, running, progress, error, snapshot, outdated, previousResults, rows,
    hasContent: (id: string) => registry.current.has(id),
  }
}
