"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  FileText,
  FileDown,
  FileSpreadsheet,
  Mail,
  Printer,
  LogOut,
  RotateCcw,
  FilePlus2,
  FolderOpen,
  KeyRound,
  UsersRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export interface SidebarMenuBarProps {
  onNewTransmittal: () => void;
  onOpenFileLibrary: (scope: "mine" | "all") => void;
  onSaveTransmittal: () => void;
  isEditingTransmittal?: boolean;
  transmittalNumber?: string;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  saveError?: string | null;
  isDraft?: boolean;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onExportCsv?: () => void;
  onSendEmail?: () => void;
  onPreviewDocx?: () => void;
  onSignOut: () => void;
  onOpenAiSettings?: () => void;
  onResetWorkspace: () => void;
  isGeneratingPdf: boolean;
  isGeneratingDocx: boolean;
}

export const SidebarMenuBar: React.FC<SidebarMenuBarProps> = ({
  onNewTransmittal,
  onOpenFileLibrary,
  onSaveTransmittal,
  isEditingTransmittal = false,
  transmittalNumber,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSavedAt = null,
  saveError = null,
  isDraft = false,
  onExportPdf,
  onExportDocx,
  onExportCsv,
  onSendEmail,
  onPreviewDocx,
  onSignOut,
  onOpenAiSettings,
  onResetWorkspace,
  isGeneratingPdf,
  isGeneratingDocx,
}) => {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const displayTransmittalNumber = transmittalNumber?.trim() || "Draft";
  const saveIndicator = isSaving
    ? "Saving…"
    : saveError
      ? "Save failed"
      : hasUnsavedChanges
        ? "Unsaved changes"
        : lastSavedAt
          ? `${isDraft ? "Draft saved" : "Saved"} ${lastSavedAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const hasPrimaryModifier = event.metaKey || event.ctrlKey;
      if (!hasPrimaryModifier || event.altKey || event.shiftKey) return;

      const key = event.key.toLowerCase();

      if (key === "o") {
        event.preventDefault();
        onOpenFileLibrary("mine");
        return;
      }

      if (key === "s") {
        event.preventDefault();
        onSaveTransmittal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenFileLibrary, onSaveTransmittal]);

  return (
    <>
      <div className="flex h-full min-w-0 flex-1 items-center gap-1 bg-white px-3">
        {/* File menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            data-tour="file-menu"
            className="px-3 py-1 rounded-md text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors outline-none cursor-default"
          >
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            sideOffset={4}
            align="start"
            className="min-w-[220px]"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold text-slate-600 normal-case leading-snug">
                What do you want to do for {displayTransmittalNumber} Document?
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onNewTransmittal}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                New Transmittal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenFileLibrary("mine")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Open Mine...
                <DropdownMenuShortcut>⌘/Ctrl+O</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenFileLibrary("all")}>
                <UsersRound className="mr-2 h-4 w-4" />
                Open All...
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onSaveTransmittal}>
                <Save className="mr-2 h-4 w-4" />
                {isEditingTransmittal ? "Update" : "Save"}
                <DropdownMenuShortcut>⌘/Ctrl+S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={onExportPdf}
                disabled={isGeneratingPdf}
              >
                <FileText className="mr-2 h-4 w-4" />
                {isGeneratingPdf ? "Generating PDF..." : "Export as PDF"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onExportDocx}
                disabled={isGeneratingDocx}
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isGeneratingDocx ? "Generating..." : "Export as Word"}
              </DropdownMenuItem>
              {onPreviewDocx && (
                <DropdownMenuItem onClick={onPreviewDocx}>
                  <Printer className="mr-2 h-4 w-4" />
                  Preview Word Document
                </DropdownMenuItem>
              )}
              {onExportCsv && (
                <DropdownMenuItem onClick={onExportCsv}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            {onSendEmail && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={onSendEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email Recipient
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {onOpenAiSettings && (
                <DropdownMenuItem onClick={onOpenAiSettings}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  AI Key Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowResetDialog(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSignOut} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {saveIndicator ? (
          <span
            className={`max-w-[170px] truncate text-[10px] font-medium ${
              saveError
                ? "text-red-500"
                : isSaving
                  ? "animate-pulse text-brand-600"
                  : hasUnsavedChanges
                    ? "text-amber-600"
                    : "text-slate-400"
            }`}
            title={saveError || saveIndicator}
            role="status"
            aria-live="polite"
          >
            {saveIndicator}
          </span>
        ) : null}

      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the current form only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowResetDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowResetDialog(false);
                onResetWorkspace();
              }}
            >
              Reset Form
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
