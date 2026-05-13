"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Trash2,
  Loader2,
  FolderOpen,
  CalendarDays,
  X,
  Copy,
  Pencil,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface TransmittalSummary {
  id: string;
  transmittalNumber: string;
  projectName: string;
  recipientName: string;
  date: string;
  itemCount: number;
}

interface TransmittalListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransmittal: (id: string) => void;
  onCopyTransmittal: (id: string) => Promise<void>;
  onDeleteTransmittal: (id: string) => Promise<void>;
  apiBaseUrl: string;
}

export const TransmittalListModal: React.FC<TransmittalListModalProps> = ({
  isOpen,
  onClose,
  onOpenTransmittal,
  onCopyTransmittal,
  onDeleteTransmittal,
  apiBaseUrl,
}) => {
  const [transmittals, setTransmittals] = useState<TransmittalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [renameTransmittalNumber, setRenameTransmittalNumber] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [renameError, setRenameError] = useState("");
  const transmittalNumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTransmittals();
      setSearch("");
      setDateFilter(undefined);
    }
  }, [isOpen]);

  useEffect(() => {
    if (renamingId) {
      transmittalNumInputRef.current?.focus();
      transmittalNumInputRef.current?.select();
    }
  }, [renamingId]);

  const fetchTransmittals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/transmittals`, {
        credentials: "include",
      });
      if (!response.ok) return;
      const payload = await response.json();
      const list: TransmittalSummary[] = Array.isArray(payload.transmittals)
        ? payload.transmittals.map((t: any) => {
            const project = t.project || {};
            const recipient = Array.isArray(t.recipients)
              ? t.recipients[0]
              : null;
            return {
              id: t.id,
              transmittalNumber: project.transmittalNumber || "",
              projectName: project.projectName || t.projectName || "Untitled",
              recipientName: recipient?.recipientName || t.recipientName || "",
              date: project.date || t.createdAt?.split("T")[0] || "",
              itemCount: Array.isArray(t.items) ? t.items.length : 0,
            };
          })
        : [];
      setTransmittals(list);
    } catch (error) {
      console.error("Failed to fetch transmittals", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteTransmittal(id);
      setTransmittals((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // handled by parent
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onCopyTransmittal(id);
  };

  const startRename = (t: TransmittalSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(t.id);
    setRenameProjectName(t.projectName);
    setRenameTransmittalNumber(t.transmittalNumber);
    setRenameError("");
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(null);
    setRenameProjectName("");
    setRenameTransmittalNumber("");
    setRenameError("");
  };

  const submitRename = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!renameProjectName.trim()) return;
    setIsSavingRename(true);
    setRenameError("");
    try {
      const res = await fetch(`${apiBaseUrl}/api/transmittals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectName: renameProjectName.trim(),
          transmittalNumber: renameTransmittalNumber.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      const result = await res.json();
      setTransmittals((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                projectName: result.projectName,
                transmittalNumber: result.transmittalNumber,
              }
            : t,
        ),
      );
      setRenamingId(null);
    } catch (err: any) {
      setRenameError(err.message || "Failed to save");
    } finally {
      setIsSavingRename(false);
    }
  };

  if (!isOpen) return null;

  const filtered = transmittals
    .filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.transmittalNumber.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        t.recipientName.toLowerCase().includes(q) ||
        t.date.includes(q);
      const dateFilterStr = dateFilter ? format(dateFilter, "yyyy-MM-dd") : "";
      const matchesDate = !dateFilterStr || t.date === dateFilterStr;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white flex flex-col max-h-[80vh]">
        <div className="p-8 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-800 font-display">
                Open Transmittal
              </h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
                {transmittals.length} saved transmittal
                {transmittals.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              ✕
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Search by ID, project, or recipient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="rounded-xl flex-1"
            />
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`rounded-xl w-[160px] justify-start text-left text-xs font-normal gap-2 ${
                    !dateFilter ? "text-muted-foreground" : ""
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  {dateFilter
                    ? format(dateFilter, "MMM dd, yyyy")
                    : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={(day) => {
                    setDateFilter(day);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {dateFilter && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9 shrink-0"
                onClick={() => setDateFilter(undefined)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FolderOpen className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">
                {search
                  ? "No matching transmittals"
                  : "No saved transmittals yet"}
              </p>
            </div>
          ) : (
            filtered.map((t) => {
              const isRenaming = renamingId === t.id;
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isRenaming) return;
                    onOpenTransmittal(t.id);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (isRenaming) return;
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenTransmittal(t.id);
                      onClose();
                    }
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    isRenaming
                      ? "border-brand-300 bg-brand-50/40 cursor-default"
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-brand-50">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          ref={transmittalNumInputRef}
                          value={renameTransmittalNumber}
                          onChange={(e) => {
                            setRenameTransmittalNumber(e.target.value);
                            setRenameError("");
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") submitRename(t.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="w-full font-mono text-[11px] font-bold text-slate-800 bg-white border border-brand-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="Transmittal number..."
                        />
                        <input
                          value={renameProjectName}
                          onChange={(e) => setRenameProjectName(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") submitRename(t.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="w-full text-xs text-slate-700 bg-white border border-brand-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-400"
                          placeholder="Project name..."
                        />
                        {renameError && renamingId === t.id && (
                          <p className="text-[10px] text-red-500">{renameError}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {t.transmittalNumber || "—"}
                          </span>
                          <span className="text-[10px] text-slate-400">{t.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{t.projectName}</p>
                      </>
                    )}

                    {!isRenaming && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {t.recipientName || "No recipient"} · {t.itemCount} item
                        {t.itemCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isRenaming ? (
                      <>
                        <button
                          onClick={(e) => submitRename(t.id, e)}
                          disabled={isSavingRename || !renameProjectName.trim()}
                          className="p-2 rounded-xl text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all disabled:opacity-40"
                          title="Save name"
                        >
                          {isSavingRename ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => startRename(t, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                          title="Rename project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleCopy(t.id, e)}
                          className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                          title="Copy transmittal"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(t.id, e)}
                          disabled={deletingId === t.id}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete transmittal"
                        >
                          {deletingId === t.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
