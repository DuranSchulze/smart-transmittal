import { describe, expect, it } from "vitest"
import { parseDocumentText } from "./local-document-parser"

describe("local document quality gate", () => {
  it("accepts explicit identity and extracts only labelled header fields", () => {
    const result = parseDocumentText("# Document title: Office Renovation Invoice\n**Invoice No:** INV-12345\nRecipient: Acme Corporation\nProject: Office Renovation\nRecipient email: accounts@example.com\nCopy status: Original")
    expect(result?.parser).toBe("pdf-inspector")
    expect(result?.items).toEqual([{ description: "Office Renovation Invoice", documentNumber: "INV-12345", qty: "1", remarks: "Original", documentType: "Document" }])
    expect(result?.header).toEqual({ recipientName: "Acme Corporation", projectName: "Office Renovation", recipientEmail: "accounts@example.com" })
  })
  it.each([
    "Title: Office Renovation Invoice",
    "Invoice No: INV-12345",
    "Title: Document\nInvoice No: INV-12345",
    "Title: Office Renovation Invoice\nInvoice No: INV-PENDING",
    "Title: Office Renovation Invoice\nInvoice No: unknown",
    "Unstructured cover page with invoice 12345 and project information",
  ])("requires Gemini for uncertain metadata: %s", text => {
    expect(parseDocumentText(text)).toBeNull()
  })
})
