import type { AppData } from "../types"
import { normalizeTransmittalNumber } from "../lib/utils"
import {
  appendTransmittalRow,
  getLinkedSheetId,
  readSheetRows,
} from "./googleSheetsService"

export async function syncFinalTransmittalToLinkedSheet(
  data: AppData,
  serverNumber: string,
): Promise<void> {
  const linkedSheetId = getLinkedSheetId()
  if (!linkedSheetId) return

  const methods: string[] = []
  if (data.transmissionMethod.personalDelivery) methods.push("Hand Delivery")
  if (data.transmissionMethod.pickUp) methods.push("Pick Up")
  if (data.transmissionMethod.grabLalamove) methods.push("Courier")
  if (data.transmissionMethod.registeredMail) methods.push("Registered Mail")

  const row = {
    transmittalNumber: serverNumber || data.project.transmittalNumber,
    date: data.project.date,
    projectName: data.project.projectName,
    recipientName: data.recipient.to,
    recipientCompany: data.recipient.company,
    preparedBy: data.signatories.preparedBy,
    notedBy: data.signatories.notedBy,
    itemsCount: data.items.length,
    transmissionMethod: methods.join(", ") || "—",
  }

  const { rows } = await readSheetRows(linkedSheetId)
  const targetNumber = normalizeTransmittalNumber(row.transmittalNumber)
  const alreadyLogged = rows.some(
    (existing) =>
      normalizeTransmittalNumber(String(existing[0] || "")) === targetNumber,
  )
  if (!alreadyLogged) await appendTransmittalRow(row)
}
