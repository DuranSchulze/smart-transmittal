import type { AppData, WorkspaceProgress } from "../types"

const hasValue = (value: string | null | undefined) => Boolean(value?.trim())

export const computeWorkspaceProgress = (data: AppData): WorkspaceProgress => ({
  files: data.items.length > 0,
  sender: hasValue(data.sender.agencyName),
  project:
    hasValue(data.project.projectName) &&
    hasValue(data.project.transmittalNumber),
  recipient: hasValue(data.recipient.to) || hasValue(data.recipient.company),
  delivery:
    Object.values(data.transmissionMethod).some(Boolean) || hasValue(data.notes),
  signoff: hasValue(data.signatories.preparedBy),
  review:
    data.items.length > 0 &&
    hasValue(data.sender.agencyName) &&
    hasValue(data.project.transmittalNumber) &&
    (hasValue(data.recipient.to) || hasValue(data.recipient.company)),
})
