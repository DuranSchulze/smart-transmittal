import { describe, expect, it } from "vitest"
import {
  createInitialTransmittalData,
  draftReducer,
  hasTransmittalFormData,
} from "./useTransmittalDraft"
import type { TransmittalItem } from "../types"

const item = (id: string, qty = "1"): TransmittalItem => ({
  id,
  qty,
  noOfItems: "0",
  documentNumber: id,
  description: id,
  remarks: "",
})

describe("draftReducer", () => {
  it("updates a nested form field without mutating the prior state", () => {
    const state = createInitialTransmittalData()
    const next = draftReducer(state, {
      type: "UPDATE_FIELD",
      section: "recipient",
      field: "to",
      value: "Client",
    })
    expect(next.recipient.to).toBe("Client")
    expect(state.recipient.to).toBe("")
  })

  it("adds and reindexes items", () => {
    const state = draftReducer(createInitialTransmittalData(), {
      type: "ADD_ITEMS",
      items: [item("a"), item("b")],
    })
    expect(state.items.map(({ noOfItems }) => noOfItems)).toEqual(["1", "2"])
  })

  it("ignores invalid item indexes", () => {
    const state = createInitialTransmittalData()
    expect(
      draftReducer(state, { type: "REMOVE_ITEM", index: 20 }),
    ).toBe(state)
  })

  it("moves, reorders, and reindexes items", () => {
    const initial = {
      ...createInitialTransmittalData(),
      items: [item("a"), item("b"), item("c")],
    }
    const moved = draftReducer(initial, {
      type: "MOVE_ITEM",
      index: 2,
      direction: "up",
    })
    expect(moved.items.map(({ id }) => id)).toEqual(["a", "c", "b"])

    const reordered = draftReducer(moved, {
      type: "REORDER_ITEMS",
      fromIndex: 0,
      toIndex: 2,
    })
    expect(reordered.items.map(({ id }) => id)).toEqual(["c", "b", "a"])
    expect(reordered.items.map(({ noOfItems }) => noOfItems)).toEqual([
      "1",
      "2",
      "3",
    ])
  })

  it("enforces a minimum quantity of one", () => {
    const initial = { ...createInitialTransmittalData(), items: [item("a")] }
    const next = draftReducer(initial, {
      type: "ADJUST_QTY",
      index: 0,
      delta: -4,
    })
    expect(next.items[0].qty).toBe("1")
  })

  it("updates transmission methods", () => {
    const next = draftReducer(createInitialTransmittalData(), {
      type: "UPDATE_TRANSMISSION",
      method: "grabLalamove",
      checked: true,
    })
    expect(next.transmissionMethod.grabLalamove).toBe(true)
  })
})

describe("hasTransmittalFormData", () => {
  it("is false for a pristine draft and true after meaningful input", () => {
    const initial = createInitialTransmittalData()
    expect(hasTransmittalFormData(initial)).toBe(false)
    expect(hasTransmittalFormData({ ...initial, notes: "Keep this" })).toBe(
      true,
    )
  })
})
