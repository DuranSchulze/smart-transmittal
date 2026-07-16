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
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
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
  isDraft: boolean;
  ownerName: string;
  isOwner: boolean;
  updatedAt?: string | null;
}

interface TransmittalListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransmittal: (id: string) => void;
  onCopyTransmittal: (id: string) => Promise<void>;
  onDeleteTransmittal: (id: string) => Promise<void>;
  apiBaseUrl: string;
  scope: "mine" | "all";
}

export const TransmittalListModal: React.FC<TransmittalListModalProps> = ({
  isOpen,
  onClose,
  onOpenTransmittal,
  onCopyTransmittal,
  onDeleteTransmittal,
  apiBaseUrl,
  scope,
}) => {
  const [transmittals, setTransmittals] = useState<TransmittalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState("updated-desc");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "final">("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [debouncedOwnerFilter, setDebouncedOwnerFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameProjectName, setRenameProjectName] = useState("");
  const [renameTransmittalNumber, setRenameTransmittalNumber] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [renameError, setRenameError] = useState("");
  const transmittalNumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setDebouncedSearch("");
      setDateFilter(undefined);
      setStatusFilter("all");
      setOwnerFilter("");
      setDebouncedOwnerFilter("");
      setSort("updated-desc");
      setPage(1);
    }
  }, [isOpen, scope]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedOwnerFilter(ownerFilter.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [ownerFilter]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();

    const loadPage = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          scope,
          page: String(page),
          pageSize: String(pageSize),
          sort,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (dateFilter) params.set("date", format(dateFilter, "yyyy-MM-dd"));
        if (scope === "mine" && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (scope === "all" && debouncedOwnerFilter) {
          params.set("owner", debouncedOwnerFilter);
        }

        const response = await fetch(
          `${apiBaseUrl}/api/transmittals?${params.toString()}`,
          { credentials: "include", signal: controller.signal },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          transmittals?: TransmittalSummary[];
          pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
          };
        };
        setTransmittals(
          Array.isArray(payload.transmittals) ? payload.transmittals : [],
        );
        setTotal(payload.pagination?.total || 0);
        setTotalPages(payload.pagination?.totalPages || 1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch transmittals", error);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadPage();
    return () => controller.abort();
  }, [
    apiBaseUrl,
    dateFilter,
    debouncedOwnerFilter,
    debouncedSearch,
    isOpen,
    page,
    pageSize,
    reloadToken,
    scope,
    sort,
    statusFilter,
  ]);

  useEffect(() => {
    if (renamingId) {
      transmittalNumInputRef.current?.focus();
      transmittalNumInputRef.current?.select();
    }
  }, [renamingId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteTransmittal(id);
      if (transmittals.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadToken((current) => current + 1);
      }
    } catch {
      // handled by parent
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onCopyTransmittal(id);
    setPage(1);
    setReloadToken((current) => current + 1);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white bg-white shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 pb-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-2xl font-black text-slate-800 font-display">
                {scope === "mine" ? "My Files" : "All Users’ Files"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
                {total} {scope === "mine" ? "personal" : "team"} document
                {total !== 1 ? "s" : ""}
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
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={
                scope === "mine"
                  ? "Search by ID, project, or recipient..."
                  : "Search by ID, project, recipient, or creator..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="min-w-[240px] flex-1 rounded-xl"
            />
            {scope === "mine" ? (
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as "all" | "draft" | "final");
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="draft">Drafts</option>
                <option value="final">Finalized</option>
              </select>
            ) : (
              <Input
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value);
                  setPage(1);
                }}
                placeholder="Filter by creator..."
                aria-label="Filter by creator"
                className="w-[180px] rounded-xl"
              />
            )}
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
                    setPage(1);
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
                onClick={() => {
                  setDateFilter(undefined);
                  setPage(1);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              aria-label="Sort files"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="created-desc">Recently created</option>
              <option value="project-asc">Project A–Z</option>
              {scope === "mine" ? (
                <option value="number-asc">Transmittal number</option>
              ) : (
                <option value="owner-asc">Creator A–Z</option>
              )}
            </select>
            <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-slate-950 text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-7 w-8 items-center justify-center rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-slate-950 text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          ) : transmittals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FolderOpen className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">
                {search || dateFilter || statusFilter !== "all" || ownerFilter
                  ? "No matching transmittals"
                  : "No saved transmittals yet"}
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-2"
              }
            >
            {transmittals.map((t) => {
              const isRenaming = renamingId === t.id;
              const canManage = scope === "mine" && t.isOwner;
              return (
                <div
                  key={t.id}
                  role={canManage ? "button" : undefined}
                  tabIndex={canManage ? 0 : undefined}
                  onClick={() => {
                    if (isRenaming || !canManage) return;
                    onOpenTransmittal(t.id);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (isRenaming || !canManage) return;
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenTransmittal(t.id);
                      onClose();
                    }
                  }}
                  className={`group flex w-full gap-4 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                    viewMode === "grid"
                      ? "min-h-[180px] flex-col items-stretch"
                      : "items-center"
                  } ${
                    isRenaming
                      ? "border-brand-300 bg-brand-50/40 cursor-default"
                      : canManage
                        ? "border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                        : "border-slate-100 bg-white cursor-default"
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
                          {t.isDraft ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Draft
                            </span>
                          ) : null}
                          <span className="text-[10px] text-slate-400">{t.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{t.projectName}</p>
                        {scope === "all" ? (
                          <p className="mt-0.5 text-[10px] font-medium text-violet-600">
                            Created by {t.ownerName}
                          </p>
                        ) : null}
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
                    {!canManage ? null : isRenaming ? (
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
            })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              {total === 0
                ? "No results"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none"
              aria-label="Files per page"
            >
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="min-w-[90px] text-center text-xs font-semibold text-slate-600">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
