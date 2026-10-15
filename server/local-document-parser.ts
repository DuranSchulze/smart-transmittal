import type { ParseResult } from "@/services/geminiService"

/** Conservative extraction: accept explicit fields only, never filename guesses. */
export function parseDocumentText(text: string): ParseResult | null {
  const lines = text.split(/\r?\n/).map(line => line
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(/\*\*/g, "")
    .trim()).filter(Boolean)
  const field = (labels: string) => {
    const pattern = new RegExp(`^(?:${labels})\\s*[:#]\\s*(.+)$`, "i")
    return lines.map(line => line.match(pattern)?.[1]?.trim()).find(Boolean) || ""
  }
  const numberLine = lines.map(line => line.match(
    /^(?:document|reference|control|invoice|receipt|certificate|official receipt|OR|eCAR|tax declaration|serial)\s*(?:no\.?|number|#)\s*[:#]?\s+([A-Z0-9][A-Z0-9./_-]{2,})\s*$/i,
  )).find(Boolean)
  const documentNumber = numberLine?.[1] || ""
  const title = field("document title|document description|title|subject|description")
  // Require both a descriptive title and a clearly labelled identifier.
  // Bare headings and filename-based numbers must go through Gemini.
  if (title.length < 8 || !documentNumber || !/\d/.test(documentNumber) ||
      /^(?:unknown|untitled|document|file|n\/a|none)$/i.test(title) ||
      /pending|unknown/i.test(documentNumber)) return null

  const header: NonNullable<ParseResult["header"]> = {}
  const labels = {
    recipientName: "recipient|recipient name|to",
    recipientEmail: "recipient email",
    companyName: "recipient company|recipient organization",
    address: "recipient address",
    projectName: "project|project name",
    projectNumber: "project number|project no\\.?",
    purpose: "purpose",
  }
  for (const [key, names] of Object.entries(labels)) {
    const value = field(names)
    if (value) header[key as keyof typeof header] = value
  }
  return {
    items: [{
      description: title, documentNumber, qty: "1",
      remarks: field("copy status|remarks"), documentType: "Document",
    }],
    ...(Object.keys(header).length ? { header } : {}),
    parser: "pdf-inspector",
  }
}
