"use client";

import React from "react";
import { Download, Cloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ExportFormat = "pdf" | "docx" | "csv";

interface ExportChoiceModalProps {
  isOpen: boolean;
  format: ExportFormat;
  fileName: string;
  isUploading: boolean;
  onDownloadLocal: () => void;
  onUploadToDrive: () => void;
  onClose: () => void;
}

const formatLabels: Record<ExportFormat, string> = {
  pdf: "PDF",
  docx: "Word Document",
  csv: "CSV Spreadsheet",
};

export const ExportChoiceModal: React.FC<ExportChoiceModalProps> = ({
  isOpen,
  format,
  fileName,
  isUploading,
  onDownloadLocal,
  onUploadToDrive,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-feature overflow-hidden animate-in zoom-in-95 duration-300 border border-divider">
        <div className="p-6 pb-2 text-center">
          <h3 className="text-lg font-semibold text-ink">
            Export {formatLabels[format]}
          </h3>
          <p className="text-xs text-helper mt-2 truncate max-w-[280px] mx-auto">
            {fileName}
          </p>
        </div>

        <div className="p-5 pt-2 space-y-3">
          <button
            onClick={onDownloadLocal}
            disabled={isUploading}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-divider bg-white shadow-card hover:border-royal/20 hover:bg-fog transition-all text-left group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-fog flex items-center justify-center group-hover:bg-wash">
              <Download className="w-4 h-4 text-helper group-hover:text-royal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">Download to device</p>
              <p className="text-xs text-helper">Save to your local computer</p>
            </div>
          </button>

          <button
            onClick={onUploadToDrive}
            disabled={isUploading}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-divider bg-white shadow-card hover:border-royal/20 hover:bg-fog transition-all text-left group"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-fog flex items-center justify-center group-hover:bg-mint/10">
              {isUploading ? (
                <Loader2 className="w-4 h-4 text-mint animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 text-helper group-hover:text-mint" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">
                {isUploading ? "Uploading..." : "Save to Google Drive"}
              </p>
              <p className="text-xs text-helper">Choose a folder in your Drive</p>
            </div>
          </button>
        </div>

        <div className="px-5 pb-5">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full rounded-full text-xs font-medium text-helper hover:text-ink"
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
