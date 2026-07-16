import { describe, expect, it } from "vitest"
import { createCsv, escapeCsvField } from "./csv"

describe("CSV serialization", () => {
  it("quotes commas, quotes, and line breaks", () => {
    expect(escapeCsvField('Drawing, revision "B"\nApproved')).toBe(
      '"Drawing, revision ""B""\nApproved"',
    )
  })

  it("uses CRLF row separators and preserves plain fields", () => {
    expect(createCsv([["No.", "Description"], [1, "Cover sheet"]])).toBe(
      "No.,Description\r\n1,Cover sheet",
    )
  })
})
