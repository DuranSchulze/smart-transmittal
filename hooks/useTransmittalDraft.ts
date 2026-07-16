"use client"

import {
  useCallback,
  useMemo,
  useReducer,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { AppData, DraftAction, TransmittalItem } from "../types"

const currentDate = () => new Date().toISOString().split("T")[0]

const currentTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

export const createInitialTransmittalData = (): AppData => ({
  recipient: {
    to: "",
    email: "",
    company: "",
    attention: "",
    address: "",
    contactNumber: "",
  },
  project: {
    projectName: "",
    projectNumber: "",
    engagementRef: "",
    purpose: "",
    transmittalNumber: "",
    department: "Admin",
    date: currentDate(),
    timeGenerated: currentTime(),
  },
  sender: {
    agencyName: "FILEPINO",
    addressLine1: "Unit 1212 High Street South Corporate Plaza Tower 2",
    addressLine2: "26th Street Bonifacio Global City, Taguig City 1634",
    website: "www.filepino.com",
    mobile: "0917 892 2337",
    telephone: "(028) 372 5023 • (02) 8478-5826",
    email: "info@filepino.com",
    logoBase64: null,
  },
  signatories: {
    preparedBy: "Admin Staff",
    preparedByRole: "Admin Staff",
    notedBy: "Operations Manager",
    notedByRole: "Operations Manager",
    timeReleased: currentTime(),
  },
  transmissionMethod: {
    personalDelivery: false,
    pickUp: false,
    grabLalamove: false,
    registeredMail: false,
  },
  receivedBy: { name: "", date: "", time: "", remarks: "" },
  footerNotes: {
    acknowledgement:
      "This is to acknowledge and confirm that the items/documents listed above are complete and in good condition.",
    disclaimer:
      "For documentation purposes, please return the signed transmittal form to our office via email or courier at your earliest convenience.",
  },
  notes: "",
  agencyId: null,
  items: [],
})

const reindexItems = (items: TransmittalItem[]) =>
  items.map((item, index) => ({ ...item, noOfItems: String(index + 1) }))

export function draftReducer(state: AppData, action: DraftAction): AppData {
  switch (action.type) {
    case "SET_DATA":
      return typeof action.data === "function" ? action.data(state) : action.data
    case "UPDATE_FIELD": {
      const section = state[action.section]
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        return state
      }
      return {
        ...state,
        [action.section]: { ...section, [action.field]: action.value },
      }
    }
    case "ADD_ITEMS":
      return action.items.length
        ? { ...state, items: reindexItems([...state.items, ...action.items]) }
        : state
    case "UPDATE_ITEM": {
      if (!state.items[action.index]) return state
      const items = [...state.items]
      items[action.index] = {
        ...items[action.index],
        [action.field]: action.value,
      }
      return { ...state, items }
    }
    case "REMOVE_ITEM":
      return state.items[action.index]
        ? {
            ...state,
            items: reindexItems(
              state.items.filter((_, index) => index !== action.index),
            ),
          }
        : state
    case "MOVE_ITEM": {
      const targetIndex =
        action.direction === "up" ? action.index - 1 : action.index + 1
      if (!state.items[action.index] || !state.items[targetIndex]) return state
      const items = [...state.items]
      ;[items[action.index], items[targetIndex]] = [
        items[targetIndex],
        items[action.index],
      ]
      return { ...state, items: reindexItems(items) }
    }
    case "REORDER_ITEMS": {
      if (
        action.fromIndex === action.toIndex ||
        !state.items[action.fromIndex] ||
        action.toIndex < 0 ||
        action.toIndex >= state.items.length
      ) {
        return state
      }
      const items = [...state.items]
      const [moved] = items.splice(action.fromIndex, 1)
      items.splice(action.toIndex, 0, moved)
      return { ...state, items: reindexItems(items) }
    }
    case "ADJUST_QTY": {
      const item = state.items[action.index]
      if (!item) return state
      const parsed = Number.parseInt(item.qty.trim(), 10)
      const quantity = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      const items = [...state.items]
      items[action.index] = {
        ...item,
        qty: String(Math.max(1, quantity + action.delta)),
      }
      return { ...state, items }
    }
    case "UPDATE_TRANSMISSION":
      return {
        ...state,
        transmissionMethod: {
          ...state.transmissionMethod,
          [action.method]: action.checked,
        },
      }
    case "RESET":
      return createInitialTransmittalData()
  }
}

export function hasTransmittalFormData(data: AppData): boolean {
  return (
    data.items.length > 0 ||
    [
      data.recipient.to,
      data.recipient.email,
      data.recipient.company,
      data.recipient.attention,
      data.recipient.address,
      data.recipient.contactNumber,
      data.project.projectName,
      data.project.projectNumber,
      data.project.engagementRef,
      data.project.purpose,
      data.project.transmittalNumber,
      data.notes,
      data.receivedBy.name,
      data.receivedBy.date,
      data.receivedBy.time,
      data.receivedBy.remarks,
    ].some((value) => value.trim().length > 0)
  )
}

export function useTransmittalDraft(initialData?: AppData) {
  const [data, dispatch] = useReducer(
    draftReducer,
    initialData,
    (value) => value || createInitialTransmittalData(),
  )

  const setData = useCallback<Dispatch<SetStateAction<AppData>>>(
    (nextData) => dispatch({ type: "SET_DATA", data: nextData }),
    [],
  )
  const reset = useCallback(() => dispatch({ type: "RESET" }), [])
  const hasFormData = useMemo(() => hasTransmittalFormData(data), [data])

  return { data, dispatch, setData, reset, hasFormData }
}
