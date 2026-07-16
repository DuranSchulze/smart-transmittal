"use client";

import React from "react";
import {
  Building2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { SenderInfo } from "@/types";
import { PanelHeader } from "../panels/PanelHeader";

interface DbAgency {
  id: string;
  name: string;
}

interface SenderTabProps {
  agencies: DbAgency[];
  isLoadingAgencies: boolean;
  agencyLoadError: string | null;
  onRetryAgencies: () => void;
  selectedAgencyId: string;
  onSelectAgency: (id: string) => void;
  onOpenAgencyModal: (mode: "create" | "update") => void;
  onDeleteAgency: () => void;
  sender: SenderInfo;
  onUpdateSender: (field: keyof SenderInfo, value: string) => void;
}

export const SenderTab: React.FC<SenderTabProps> = ({
  agencies,
  isLoadingAgencies,
  agencyLoadError,
  onRetryAgencies,
  selectedAgencyId,
  onSelectAgency,
  onOpenAgencyModal,
  onDeleteAgency,
  sender,
  onUpdateSender,
}) => {
  const hasSelectedAgency = Boolean(selectedAgencyId);
  const fields: Array<{
    key: Exclude<keyof SenderInfo, "logoBase64">;
    label: string;
    span?: boolean;
  }> = [
    { key: "agencyName", label: "Agency name", span: true },
    { key: "addressLine1", label: "Address line 1", span: true },
    { key: "addressLine2", label: "Address line 2", span: true },
    { key: "website", label: "Website" },
    { key: "email", label: "Email" },
    { key: "telephone", label: "Telephone" },
    { key: "mobile", label: "Mobile" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-200">
      <PanelHeader
        title="Sender"
        description="Select a saved agency or adjust the sender details for this transmittal."
      />
      <div className="space-y-5 p-6">
        {isLoadingAgencies ? (
          <p className="text-xs text-slate-500">Loading saved agencies…</p>
        ) : null}
        {agencyLoadError ? (
          <button
            type="button"
            onClick={onRetryAgencies}
            className="text-xs font-semibold text-red-600"
          >
            Saved agencies are unavailable. Retry
          </button>
        ) : null}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-600">
            Saved Agencies
          </Label>
          <Select
            value={selectedAgencyId}
            onValueChange={(val) => onSelectAgency(val as string)}
            items={agencies.map((agency) => ({
              value: agency.id,
              label: agency.name || "Unnamed agency",
            }))}
          >
            <SelectTrigger className="h-10 w-full rounded-xl">
              <SelectValue placeholder="Select agency..." />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name || "Unnamed agency"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() =>
              onOpenAgencyModal(hasSelectedAgency ? "update" : "create")
            }
            className="h-9 flex-1 rounded-xl text-[10px] font-bold"
          >
            {hasSelectedAgency ? "Update" : "Add"}
          </Button>

          {hasSelectedAgency ? (
            <Button
              onClick={() => onOpenAgencyModal("create")}
              variant="outline"
              className="h-9 flex-1 rounded-xl text-[10px] font-bold"
            >
              Add New
            </Button>
          ) : null}

          <Button
            onClick={onDeleteAgency}
            variant="ghost"
            disabled={!hasSelectedAgency}
            className="h-9 rounded-xl px-3 text-[10px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-slate-300"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
            {sender.logoBase64 ? (
              <img
                src={sender.logoBase64}
                alt="Company Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-6 w-6 text-slate-300" />
            )}
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Current sender
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {sender.agencyName || "No agency selected"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">Changes auto-save with this draft.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map(({ key, label, span }) => (
            <div key={key} className={`space-y-1.5 ${span ? "col-span-2" : ""}`}>
              <Label className="text-[10px] font-bold text-slate-600">{label}</Label>
              <Input
                value={sender[key]}
                onChange={(event) => onUpdateSender(key, event.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
