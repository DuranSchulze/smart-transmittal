"use client";

import React, { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Building2, Plus, RefreshCw, ChevronRight, X, Pencil, Trash2 } from "lucide-react";
import { getAgencyLogo } from "@/lib/agency-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AgencyRecord } from "@/services/agency-api";
import type { SenderInfo } from "@/types";
import { PanelHeader } from "../panels/PanelHeader";

interface SenderTabProps {
  agencies: AgencyRecord[];
  isLoadingAgencies: boolean;
  agencyLoadError: string | null;
  onRetryAgencies: () => void;
  selectedAgencyId: string;
  onSelectAgency: (id: string) => void;
  onOpenAgencyModal: (mode: "create" | "update", agencyId?: string) => void;
  onDeleteAgency: (agencyId?: string) => void;
  canManageSelectedAgency: boolean;
  sender: SenderInfo;
  onUpdateSender: (field: keyof SenderInfo, value: string) => void;
}

const fields = [
  ["agencyName", "Agency name"], ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"], ["website", "Website"],
  ["email", "Email"], ["telephone", "Telephone"], ["mobile", "Mobile"],
] as const;

function Logo({ source, name }: { source?: string | null; name: string }) {
  return <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-divider bg-white">
    {source ? <img src={source} alt={`${name} logo`} loading="lazy" className="h-full w-full object-contain" /> : <Building2 className="h-5 w-5 text-helper" />}
  </div>;
}

function DetailsDialog({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description: string; children: React.ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-[100] bg-ink/30 backdrop-blur-sm" />
      <Dialog.Popup className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-divider bg-white p-6 shadow-xl outline-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><Dialog.Title className="break-words text-base font-semibold text-ink">{title}</Dialog.Title><Dialog.Description className="mt-1 text-xs leading-relaxed text-helper">{description}</Dialog.Description></div>
          <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close dialog" className="shrink-0" />}><X className="h-4 w-4" /></Dialog.Close>
        </div>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

export const SenderTab: React.FC<SenderTabProps> = ({ agencies, isLoadingAgencies, agencyLoadError, onRetryAgencies, selectedAgencyId, onSelectAgency, onOpenAgencyModal, onDeleteAgency, sender, onUpdateSender }) => {
  const [search, setSearch] = useState("");
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [senderDraft, setSenderDraft] = useState<SenderInfo | null>(null);
  const inspected = agencies.find(agency => agency.id === inspectedId);
  const visible = agencies.filter(agency => agency.name.toLowerCase().includes(search.trim().toLowerCase()));
  const details = inspected ? [
    ["Address", [inspected.addressLine1, inspected.addressLine2].filter(Boolean).join(", ")],
    ["Website", inspected.website], ["Email", inspected.email],
    ["Telephone", inspected.telephoneNumber], ["Mobile", inspected.contactNumber],
  ] : [];

  return <div className="animate-in fade-in slide-in-from-left-2 duration-200">
    <PanelHeader title="Sender" description="Choose an agency to use its saved logo and contact details." />
    <div className="space-y-5 p-6">
      <section className="rounded-2xl border border-divider bg-wash/40 p-4" aria-label="Current sender">
        <div className="flex items-center gap-3"><Logo source={getAgencyLogo(sender)} name={sender.agencyName || "Sender"} /><div className="min-w-0"><p className="text-[11px] font-medium text-helper">On this transmittal</p><p className="break-words text-sm font-semibold text-ink">{sender.agencyName || "Choose your sender"}</p></div></div>
        <Button variant="outline" size="sm" className="mt-3 rounded-full text-xs" onClick={() => setSenderDraft({ ...sender })}><Pencil className="mr-1.5 h-3 w-3" />Edit transmittal details</Button>
      </section>
      <section aria-label="Shared agency library" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-ink">Use an existing agency</h3><p className="mt-1 text-xs text-helper">Choose a saved agency, or create a new one.</p></div><Button onClick={() => onOpenAgencyModal("create")} className="h-9 rounded-full text-xs"><Plus className="mr-1 h-4 w-4" />Create agency</Button></div>
        <div className="flex gap-2"><Input aria-label="Search agencies" placeholder="Search agencies…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 rounded-xl text-xs" /><Button variant="outline" size="icon" aria-label="Refresh agencies" disabled={isLoadingAgencies} onClick={onRetryAgencies} className="shrink-0 rounded-xl"><RefreshCw className={`h-4 w-4 ${isLoadingAgencies ? "animate-spin" : ""}`} /></Button></div>
        {agencyLoadError && <p role="alert" className="text-xs text-coral">Could not load agencies. Use Refresh agencies to try again.</p>}
        {isLoadingAgencies && <p role="status" className="text-xs text-helper">Loading agencies…</p>}
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {visible.map(agency => <div key={agency.id} className={`rounded-xl border ${selectedAgencyId === agency.id ? "border-royal bg-wash/50" : "border-divider bg-white"}`}>
            <button type="button" aria-label={`Open ${agency.name}`} onClick={() => setInspectedId(agency.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-wash focus-visible:outline-2 focus-visible:outline-royal">
              <Logo source={agency.logoUrl || agency.logoBase64} name={agency.name} />
              <span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold text-ink">{agency.name}</span><span className="mt-1 block text-[11px] text-helper">{selectedAgencyId === agency.id ? "Current agency" : agency.canManage ? "Created by you" : "Shared agency"}</span></span>
              <ChevronRight className="h-4 w-4 shrink-0 text-helper" />
            </button>
            <div className="flex flex-wrap justify-end gap-1 px-3 pb-2">
              {agency.canManage && <Button variant="outline" size="sm" aria-label={`Edit ${agency.name}`} onClick={() => onOpenAgencyModal("update", agency.id)} className="h-8 rounded-full text-xs"><Pencil className="mr-1.5 h-3 w-3" />Edit</Button>}
              <Button variant="ghost" size="sm" aria-label={`Delete ${agency.name}`} onClick={() => onDeleteAgency(agency.id)} className="h-8 rounded-full text-xs text-coral"><Trash2 className="mr-1.5 h-3 w-3" />Delete</Button>
            </div>
          </div>)}
        </div>
        {!isLoadingAgencies && !agencyLoadError && !visible.length && <p className="rounded-xl border border-dashed border-divider p-5 text-center text-xs text-helper">{agencies.length ? "No agencies match your search." : "Create the first agency with its logo and contact details."}</p>}
        <p className="text-[11px] leading-relaxed text-helper">Everyone signed in can use or delete an agency. Only its creator can edit shared details.</p>
      </section>
    </div>
    <DetailsDialog open={Boolean(inspected)} onClose={() => setInspectedId(null)} title={inspected?.name || "Agency details"} description="Saved in the shared agency library.">
      {inspected && <><div className="mt-5"><Logo source={inspected.logoUrl || inspected.logoBase64} name={inspected.name} /></div><dl className="my-5 space-y-3">{details.map(([label, value]) => <div key={label}><dt className="text-[11px] font-medium text-helper">{label}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink">{value || "Not provided"}</dd></div>)}</dl>
        <div className="flex flex-wrap gap-2 border-t border-divider pt-4"><Button className="rounded-full text-xs" onClick={() => { onSelectAgency(inspected.id); setInspectedId(null); }}>Use this agency</Button>{inspected.canManage && <><Button variant="outline" className="rounded-full text-xs" onClick={() => { onOpenAgencyModal("update", inspected.id); setInspectedId(null); }}><Pencil className="mr-1.5 h-3 w-3" />Edit agency</Button></> }<Button variant="ghost" className="rounded-full text-xs text-coral" onClick={() => onDeleteAgency(inspected.id)}><Trash2 className="mr-1.5 h-3 w-3" />Delete</Button></div></>}
    </DetailsDialog>
    <DetailsDialog open={Boolean(senderDraft)} onClose={() => setSenderDraft(null)} title="Transmittal sender details" description="Changes apply to this transmittal only. The shared agency stays the same.">
      {senderDraft && <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); fields.forEach(([key]) => onUpdateSender(key, senderDraft[key])); setSenderDraft(null); }}>
        {fields.map(([key, label]) => <div key={key} className="space-y-1"><Label htmlFor={`sender-${key}`} className="text-xs">{label}</Label><Input id={`sender-${key}`} value={senderDraft[key]} onChange={event => setSenderDraft({ ...senderDraft, [key]: event.target.value })} className="text-xs" /></div>)}
        <div className="flex flex-wrap gap-2 pt-3"><Button type="submit" className="rounded-full text-xs">Save sender details</Button><Button type="button" variant="outline" className="rounded-full text-xs" onClick={() => setSenderDraft(null)}>Cancel</Button>{selectedAgencyId && <Button type="button" variant="ghost" className="rounded-full text-xs" onClick={() => { onSelectAgency(""); setSenderDraft(null); }}>Detach agency</Button>}</div>
      </form>}
    </DetailsDialog>
  </div>;
};
