import { apiFetch, apiJsonOptions } from "../lib/api-client"
import type { AgencyInput } from "../lib/validation"
import { resolveApiUrl } from "./api-url"

export type AgencyRecord = {
  id: string
  name: string
  addressLine1: string | null
  addressLine2: string | null
  website: string | null
  telephoneNumber: string | null
  contactNumber: string | null
  email: string | null
  logoBase64: string | null
  createdAt?: string
  updatedAt: string
}

export async function listAgencies(baseUrl?: string) {
  const response = await apiFetch<{ agencies: AgencyRecord[] }>(
    resolveApiUrl("/api/agencies", baseUrl),
  )
  return response.agencies
}

export async function createAgency(agency: AgencyInput, baseUrl?: string) {
  const response = await apiFetch<{ agency: AgencyRecord }>(
    resolveApiUrl("/api/agencies", baseUrl),
    apiJsonOptions("POST", { agency }),
  )
  return response.agency
}

export async function updateAgency(
  id: string,
  agency: AgencyInput,
  baseUrl?: string,
) {
  const response = await apiFetch<{ agency: AgencyRecord }>(
    resolveApiUrl(`/api/agencies/${encodeURIComponent(id)}`, baseUrl),
    apiJsonOptions("PUT", { agency }, { retries: 3 }),
  )
  return response.agency
}

export function deleteAgency(id: string, baseUrl?: string) {
  return apiFetch<{ ok: true }>(
    resolveApiUrl(`/api/agencies/${encodeURIComponent(id)}`, baseUrl),
    { method: "DELETE" },
  )
}
