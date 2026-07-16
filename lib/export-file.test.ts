import { describe, expect, it } from "vitest"
import { createExportFileName, sanitizeExportBaseName } from "./export-file"

describe("export filenames", () => {
  it("removes characters rejected by production operating systems", () => {
    expect(sanitizeExportBaseName(' TR/2026:07 * "Final" ')).toBe(
      "TR-2026-07 - -Final-",
    )
  })

  it("uses a stable fallback when a transmittal number is empty", () => {
    expect(createExportFileName("", "_items", "csv")).toBe(
      "transmittal_items.csv",
    )
  })
})
