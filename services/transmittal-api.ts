import type { AppData } from "../types"
import { apiFetch, apiJsonOptions } from "../lib/api-client"
import { resolveApiUrl } from "./api-url"

export type SavedTransmittalRecord = {
  id: string
  isOwner?: boolean
  isDraft?: boolean
  transmittalNumber?: string | null
  project?: Record<string, unknown> & {
    transmittalNumber?: string
    date?: string
    timeGenerated?: string
  }
  recipients?: Array<{
    recipientName?: string
    recipientAgencyEmail?: string
    recipientOrganization?: string
    recipientAttention?: string
    recipientFullAddress?: string
    recipientAgencyContactNumber?: string
  }>
  items?: Array<Record<string, unknown>>
  agency?: { id?: string | null } | null
  agencyId?: string | null
  sender?: Record<string, unknown>
  receivedBy?: Record<string, unknown>
  footerNotes?: Record<string, unknown>
  projectName?: string
  projectNumber?: string | null
  engagementRefNumber?: string | null
  projectPurpose?: string | null
  department?: string | null
  preparedBy?: string
  preparedByRole?: string
  notedBy?: string
  notedByRole?: string
  timeReleased?: string
  notes?: string
  handDelivery?: boolean
  pickUp?: boolean
  courier?: boolean
  registeredMail?: boolean
  createdAt?: string
  updatedAt?: string | null
}

export type TransmittalSuggestions = {
  projectNames: string[]
  departments: string[]
  preparedByNames: string[]
  preparedByRoles: string[]
  notedByNames: string[]
  notedByRoles: string[]
}

type SaveResponse = {
  transmittal: SavedTransmittalRecord
  wasDraft?: boolean
}

export function getTransmittal(id: string, baseUrl?: string) {
  return apiFetch<SavedTransmittalRecord>(
    resolveApiUrl(`/api/transmittals/${encodeURIComponent(id)}`, baseUrl),
  )
}

export function createTransmittal(
  data: AppData,
  options: { isDraft: boolean },
  baseUrl?: string,
) {
  return apiFetch<SaveResponse>(
    resolveApiUrl("/api/transmittals", baseUrl),
    apiJsonOptions("POST", { data, isDraft: options.isDraft }),
  )
}

export function updateTransmittal(
  id: string,
  data: AppData,
  options: { isDraft: boolean },
  baseUrl?: string,
) {
  return apiFetch<SaveResponse>(
    resolveApiUrl(`/api/transmittals/${encodeURIComponent(id)}`, baseUrl),
    apiJsonOptions("PUT", { data, isDraft: options.isDraft }, { retries: 3 }),
  )
}

export function patchTransmittal(
  id: string,
  fields: { projectName?: string; transmittalNumber?: string },
  baseUrl?: string,
) {
  return apiFetch<{
    ok: true
    projectName: string
    transmittalNumber: string
  }>(
    resolveApiUrl(`/api/transmittals/${encodeURIComponent(id)}`, baseUrl),
    apiJsonOptions("PATCH", fields, { retries: 3 }),
  )
}

export function deleteTransmittal(id: string, baseUrl?: string) {
  return apiFetch<{ ok: true }>(
    resolveApiUrl(`/api/transmittals/${encodeURIComponent(id)}`, baseUrl),
    { method: "DELETE" },
  )
}

export async function getNextTransmittalNumber(baseUrl?: string) {
  const response = await apiFetch<{ transmittalNumber: string }>(
    resolveApiUrl("/api/transmittals/next-number", baseUrl),
  )
  return response.transmittalNumber
}

export function getTransmittalSuggestions(baseUrl?: string) {
  return apiFetch<TransmittalSuggestions>(
    resolveApiUrl("/api/transmittal-suggestions", baseUrl),
  )
}
