import type { AppData, TransmittalItem } from "../types"
import { normalizeTransmittalNumber, stripTransmittalPrefix } from "../lib/utils"
import { resolveDocumentNumberWithFallback } from "./geminiService"
import type { SavedTransmittalRecord } from "./transmittal-api"

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const text = (value: unknown) => (typeof value === "string" ? value : "")

export type TransmittalNumberValidation = {
  normalizedValue: string
  isDuplicate: boolean
  conflictingTransmittalId: string | null
  message: string
}

export function mapSavedTransmittalToAppData(
  transmittal: SavedTransmittalRecord,
): AppData {
  const project = asRecord(transmittal.project)
  const sender = asRecord(transmittal.sender)
  const receivedBy = asRecord(transmittal.receivedBy)
  const footerNotes = asRecord(transmittal.footerNotes)
  const recipient = transmittal.recipients?.[0]

  return {
    agencyId: transmittal.agencyId || transmittal.agency?.id || null,
    recipient: {
      to: recipient?.recipientName || "",
      email: recipient?.recipientAgencyEmail || "",
      company: recipient?.recipientOrganization || "",
      attention: recipient?.recipientAttention || "",
      address: recipient?.recipientFullAddress || "",
      contactNumber: recipient?.recipientAgencyContactNumber || "",
    },
    project: {
      projectName: text(project.projectName) || transmittal.projectName || "",
      projectNumber:
        text(project.projectNumber) || transmittal.projectNumber || "",
      engagementRef:
        text(project.engagementRef) || transmittal.engagementRefNumber || "",
      purpose: text(project.purpose) || transmittal.projectPurpose || "",
      transmittalNumber: stripTransmittalPrefix(
        text(project.transmittalNumber) || transmittal.transmittalNumber || "",
      ),
      department: text(project.department) || transmittal.department || "",
      date: text(project.date),
      timeGenerated: text(project.timeGenerated),
    },
    items: (transmittal.items || []).map((rawItem, index) => {
      const item = asRecord(rawItem)
      const description = text(item.description)
      return {
        id: text(item.id) || `loaded-${transmittal.id}-${index}`,
        qty: text(item.qty),
        noOfItems: text(item.noOfItems),
        documentNumber: resolveDocumentNumberWithFallback({
          currentDocumentNumber: text(item.documentNumber),
          sourceName: description,
          description,
          documentType: text(item.documentType),
        }),
        description,
        remarks: text(item.remarks),
        fileType:
          item.fileType === "upload" ||
          item.fileType === "gdrive" ||
          item.fileType === "link"
            ? item.fileType
            : undefined,
        fileSource: text(item.fileSource) || undefined,
      } satisfies TransmittalItem
    }),
    sender: {
      agencyName: text(sender.agencyName),
      addressLine1: text(sender.addressLine1),
      addressLine2: text(sender.addressLine2),
      website: text(sender.website),
      mobile: text(sender.mobile),
      telephone: text(sender.telephone),
      email: text(sender.email),
      logoBase64: text(sender.logoBase64) || null,
    },
    signatories: {
      preparedBy: transmittal.preparedBy || "",
      preparedByRole: transmittal.preparedByRole || "",
      notedBy: transmittal.notedBy || "",
      notedByRole: transmittal.notedByRole || "",
      timeReleased: transmittal.timeReleased || "",
    },
    receivedBy: {
      name: text(receivedBy.name),
      date: text(receivedBy.date),
      time: text(receivedBy.time),
      remarks: text(receivedBy.remarks),
    },
    footerNotes: {
      acknowledgement: text(footerNotes.acknowledgement),
      disclaimer: text(footerNotes.disclaimer),
    },
    notes: transmittal.notes || "",
    transmissionMethod: {
      personalDelivery: Boolean(transmittal.handDelivery),
      pickUp: Boolean(transmittal.pickUp),
      grabLalamove: Boolean(transmittal.courier),
      registeredMail: Boolean(transmittal.registeredMail),
    },
  }
}

export function createCopiedDraft(
  source: SavedTransmittalRecord,
  nextNumber: string,
  now = new Date(),
): AppData {
  const data = mapSavedTransmittalToAppData(source)
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return {
    ...data,
    agencyId: source.isOwner === false ? null : data.agencyId,
    project: {
      ...data.project,
      transmittalNumber: nextNumber,
      date: now.toISOString().split("T")[0],
      timeGenerated: time,
    },
    signatories: { ...data.signatories, timeReleased: time },
    items: data.items.map((item, index) => ({
      ...item,
      id: `copy-${now.getTime()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    })),
  }
}

export function validateTransmittalNumber(
  value: string,
  records: SavedTransmittalRecord[],
  activeId: string | null,
): TransmittalNumberValidation {
  const normalizedValue = normalizeTransmittalNumber(value)
  if (!normalizedValue) {
    return {
      normalizedValue,
      isDuplicate: false,
      conflictingTransmittalId: null,
      message: "",
    }
  }

  const conflict = records.find((record) => {
    if (record.id === activeId) return false
    if (record.isDraft && !record.transmittalNumber) return false
    return (
      normalizeTransmittalNumber(
        record.transmittalNumber ||
          text(asRecord(record.project).transmittalNumber),
      ) === normalizedValue
    )
  })

  return {
    normalizedValue,
    isDuplicate: Boolean(conflict),
    conflictingTransmittalId: conflict?.id || null,
    message: conflict
      ? `Transmittal ID "${normalizedValue}" already exists. Use a different ID before saving.`
      : "",
  }
}
