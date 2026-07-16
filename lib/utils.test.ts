import { describe, expect, it } from "vitest"
import {
  ensureTransmittalPrefix,
  stripTransmittalPrefix,
} from "./utils"

describe("transmittal-number utilities", () => {
  it("round-trips an unprefixed number", () => {
    const stored = ensureTransmittalPrefix("202607-0001")
    expect(stored).toBe("TR-FP-202607-0001")
    expect(stripTransmittalPrefix(stored)).toBe("202607-0001")
  })

  it("does not double-prefix a stored number", () => {
    expect(ensureTransmittalPrefix("TR-FP-202607-0001")).toBe(
      "TR-FP-202607-0001",
    )
  })

  it("keeps an empty value empty", () => {
    expect(ensureTransmittalPrefix("  ")).toBe("")
    expect(stripTransmittalPrefix("  ")).toBe("")
  })
})
