"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface DriveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: Array<{ id: string; name: string; mimeType: string }>;
  searchValue: string;
  isLoading: boolean;
  error: string;
  selectedIds: Record<string, boolean>;
  isAllSelected: boolean;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAddSelected: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isImporting?: boolean;
  processingMessage?: string;
}

export const DriveFileModal: React.FC<DriveFileModalProps> = ({
  isOpen,
  onClose,
  files,
  searchValue,
  isLoading,
  error,
  selectedIds,
  isAllSelected,
  onSearchChange,
  onSearch,
  onToggle,
  onToggleAll,
  onAddSelected,
  hasMore = false,
  onLoadMore,
  isImporting = false,
  processingMessage = "",
}) => {
  if (!isOpen) return null;
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-feature overflow-hidden animate-in zoom-in-95 duration-300 border border-divider">
        <div className="p-5 border-b border-divider flex justify-between items-center bg-fog">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              Browse Drive Files
            </h3>
            <p className="text-xs font-medium text-helper mt-1">
              Search and select documents to import
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full text-helper hover:text-ink"
            disabled={isImporting}
          >
            ✕
          </Button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !isLoading && !isImporting) onSearch(); }}
                placeholder="Search by file name"
                disabled={isImporting}
              />
            </div>
            <Button
              onClick={onSearch}
              disabled={isLoading || isImporting}
              className="rounded-full font-medium"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Working...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>

          <div className="border border-divider rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 bg-fog border-b border-divider">
              <label className="flex items-center gap-2 text-xs font-medium text-helper">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  disabled={files.length === 0 || isLoading || isImporting}
                  className="w-4 h-4 rounded-md text-royal border-divider"
                />
                Select All
              </label>
              <Badge variant="secondary">
                {files.length} file{files.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {isLoading && files.length === 0 ? (
                <div className="p-6 text-xs font-medium text-helper">
                  Loading Drive files...
                </div>
              ) : files.length === 0 ? (
                <div className="p-6 text-xs font-medium text-helper">
                  {error || "No files found."}
                </div>
              ) : (
                <ul className="divide-y divide-divider">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-3 p-3 hover:bg-fog transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedIds[file.id]}
                        onChange={() => onToggle(file.id)}
                        disabled={isImporting || isLoading}
                        className="w-4 h-4 rounded-md text-royal border-divider"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-ink">
                          {file.name}
                        </p>
                        <p className="text-xs text-helper">
                          {file.mimeType}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {hasMore && (
            <Button variant="outline" onClick={onLoadMore} disabled={isLoading || isImporting} className="w-full rounded-full">
              {isLoading ? "Loading more files…" : "Load more files"}
            </Button>
          )}

          {error && files.length > 0 && (
            <div className="p-3 rounded-lg text-xs font-medium border bg-coral/10 border-coral/20 text-coral">
              {error}
            </div>
          )}

          {isImporting ? (
            <div className="p-3 rounded-lg text-xs font-medium border bg-wash border-royal/20 text-royal flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {processingMessage || "Importing selected Drive files..."}
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 rounded-full font-medium bg-fog text-caption hover:bg-fog/80"
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={onAddSelected}
              disabled={selectedCount === 0 || isImporting || isLoading}
              className="flex-1 rounded-full bg-royal text-white text-xs font-medium hover:bg-royal/90 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Add Selected (${selectedCount})`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
