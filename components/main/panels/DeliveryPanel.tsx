"use client"

import type { AppData } from "@/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PanelHeader } from "./PanelHeader"

type DeliveryPanelProps = {
  transmissionMethod: AppData["transmissionMethod"]
  onUpdateTransmission: (
    method: keyof AppData["transmissionMethod"],
    checked: boolean,
  ) => void
  notes: string
  onUpdateNotes: (value: string) => void
}

const options = [
  { key: "personalDelivery", label: "Hand delivered" },
  { key: "pickUp", label: "Pick-up" },
  { key: "grabLalamove", label: "Courier" },
  { key: "registeredMail", label: "Registered mail" },
] as const

export function DeliveryPanel(props: DeliveryPanelProps) {
  return (
    <div data-tour="transmission" className="animate-in fade-in slide-in-from-left-2 duration-200">
      <PanelHeader
        title="Delivery & notes"
        description="Choose how the package will be transmitted and add internal context."
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-2">
          {options.map(({ key, label }) => (
            <label
              key={key}
              className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                props.transmissionMethod[key]
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={props.transmissionMethod[key]}
                onChange={(event) => props.onUpdateTransmission(key, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span className="mt-2 block text-[10px] font-bold text-slate-700">
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-slate-600">Internal notes</Label>
          <Textarea
            rows={7}
            value={props.notes}
            onChange={(event) => props.onUpdateNotes(event.target.value)}
            placeholder="Add handling instructions or internal context…"
            className="resize-none rounded-xl"
          />
        </div>
      </div>
    </div>
  )
}
