"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  X,
  FileText,
  Cloud,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileToDrive } from "@/services/googleDriveService";
import { isImageDocument } from "@/lib/import-file-policy";
import { FolderPickerModal } from "./FolderPickerModal";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadFiles: (files: File[]) => void;
  isDriveReady: boolean;
  isParsing: boolean;
  parseProgress: { current: number; total: number };
  initialFiles?: File[];
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadFiles,
  isDriveReady,
  isParsing,
  parseProgress,
  initialFiles,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [saveToDrive, setSaveToDrive] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const [driveUploadMsg, setDriveUploadMsg] = useState("");
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];

  const isAccepted = (file: File) =>
    !isImageDocument(file.type, file.name) && acceptedTypes.some((t) =>
      t.endsWith("/") ? file.type.startsWith(t) : file.type === t,
    );

  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0) {
      const valid = initialFiles.filter(isAccepted);
      const rejectedCount = initialFiles.length - valid.length;
      setSelectedFiles(valid);
      if (rejectedCount > 0) {
        setRejectedNotice(
          `${rejectedCount} file${rejectedCount !== 1 ? "s were" : " was"} skipped — only PDF and Word (.doc/.docx) files are supported. Images are not allowed.`,
        );
      }
    }
  }, [isOpen]);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const valid = newFiles.filter(isAccepted);
      const rejectedCount = newFiles.length - valid.length;
      if (rejectedCount > 0) {
        setRejectedNotice(
          `${rejectedCount} file${rejectedCount !== 1 ? "s were" : " was"} skipped — only PDF and Word (.doc/.docx) files are supported. Images are not allowed.`,
        );
        setTimeout(() => setRejectedNotice(null), 6000);
      }
      if (valid.length === 0) return;
      setSelectedFiles((prev) => {
        const names = new Set(prev.map((f) => f.name));
        const deduped = valid.filter((f) => !names.has(f.name));
        return [...prev, ...deduped];
      });
    },
    [],
  );

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
    e.target.value = "";
  };

  const handleProcess = () => {
    if (selectedFiles.length === 0) return;
    if (saveToDrive && isDriveReady) {
      setFolderPickerOpen(true);
    } else {
      onUploadFiles(selectedFiles);
      setSelectedFiles([]);
      onClose();
    }
  };

  const handleFolderSelected = async (folderId: string, folderName: string) => {
    setFolderPickerOpen(false);
    setDriveUploadStatus("uploading");
    setDriveUploadMsg(`Saving to ${folderName}...`);

    try {
      for (const file of selectedFiles) {
        const blob = new Blob([file], { type: file.type });
        await uploadFileToDrive(blob, file.name, folderId);
      }
      setDriveUploadStatus("done");
      setDriveUploadMsg(`${selectedFiles.length} file(s) saved to ${folderName}`);
    } catch (err: any) {
      setDriveUploadStatus("error");
      setDriveUploadMsg(`Drive upload failed: ${err.message}`);
    }

    // Also process them for data extraction
    onUploadFiles(selectedFiles);
    setTimeout(() => {
      setSelectedFiles([]);
      setDriveUploadStatus("idle");
      setDriveUploadMsg("");
      setSaveToDrive(false);
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    if (isParsing || driveUploadStatus === "uploading") return;
    setSelectedFiles([]);
    setSaveToDrive(false);
    setDriveUploadStatus("idle");
    setDriveUploadMsg("");
    setRejectedNotice(null);
    onClose();
  };

  const getFileIcon = (file: File) => {
    if (
      file.type === "application/msword" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return <FileText className="w-4 h-4 text-azure" />;
    return <FileText className="w-4 h-4 text-royal" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-feature overflow-hidden animate-in zoom-in-95 duration-300 border border-divider flex flex-col max-h-[80vh]">
          {/* Header */}
          <div className="p-5 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-ink">
                Upload Files
              </h3>
              <p className="text-xs text-helper mt-1">
                PDF and Word (.doc/.docx) supported. Images are not allowed.
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="rounded-full text-helper hover:text-ink"
              disabled={isParsing || driveUploadStatus === "uploading"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Drop zone */}
          <div className="px-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-royal/40 bg-wash scale-[1.01]"
                  : "border-divider hover:border-royal/30 hover:bg-fog/60"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                    isDragging ? "bg-wash" : "bg-fog"
                  }`}
                >
                  <Upload
                    className={`w-5 h-5 ${isDragging ? "text-royal" : "text-helper"}`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {isDragging ? "Drop files here" : "Drag & drop files here"}
                  </p>
                  <p className="text-xs text-helper mt-1">
                    or click to browse your device
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </div>

          {/* File list */}
          {selectedFiles.length > 0 && (
            <div className="flex-1 overflow-y-auto px-5 mt-4 space-y-2 min-h-0 max-h-[200px]">
              <p className="text-xs font-medium text-helper">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
              </p>
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white border border-divider shadow-card hover:bg-fog group"
                >
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-helper">
                      {formatSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-coral/10 rounded-full"
                  >
                    <Trash2 className="w-3 h-3 text-coral" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Rejected files notice */}
          {rejectedNotice && (
            <div className="px-5 mt-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{rejectedNotice}</span>
                <button
                  onClick={() => setRejectedNotice(null)}
                  className="ml-auto shrink-0 hover:text-amber-900 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Drive toggle + status */}
          <div className="px-5 mt-4 space-y-3">
            {isDriveReady && selectedFiles.length > 0 && (
              <label className="flex items-center gap-3 p-3 rounded-lg border border-divider bg-white shadow-card cursor-pointer hover:bg-fog transition-all">
                <input
                  type="checkbox"
                  checked={saveToDrive}
                  onChange={(e) => setSaveToDrive(e.target.checked)}
                  className="w-4 h-4 rounded text-royal border-divider"
                />
                <Cloud className="w-4 h-4 text-helper" />
                <span className="text-xs font-medium text-caption">
                  Also save original files to Google Drive
                </span>
              </label>
            )}

            {driveUploadMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                  driveUploadStatus === "error"
                    ? "bg-coral/10 border-coral/20 text-coral"
                    : driveUploadStatus === "done"
                      ? "bg-mint/10 border-mint/20 text-mint"
                      : "bg-wash border-royal/20 text-royal"
                }`}
              >
                {driveUploadStatus === "uploading" && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                {driveUploadStatus === "done" && (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                {driveUploadMsg}
              </div>
            )}

            {isParsing && (
              <div className="p-3 rounded-lg text-xs font-medium border bg-wash border-royal/20 text-royal flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Parsing {parseProgress.current}/{parseProgress.total} files...
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 pt-4 flex gap-3">
            <Button
              onClick={handleProcess}
              disabled={
                selectedFiles.length === 0 ||
                isParsing ||
                driveUploadStatus === "uploading"
              }
              className="flex-1 rounded-full text-xs font-medium"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Processing...
                </>
              ) : saveToDrive ? (
                "Upload & Save to Drive"
              ) : (
                `Upload ${selectedFiles.length || ""} File${selectedFiles.length !== 1 ? "s" : ""}`
              )}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="rounded-full text-xs font-medium"
              disabled={isParsing || driveUploadStatus === "uploading"}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <FolderPickerModal
        isOpen={folderPickerOpen}
        onClose={() => {
          setFolderPickerOpen(false);
          // Still process files even if folder picker is cancelled
          onUploadFiles(selectedFiles);
          setSelectedFiles([]);
          setSaveToDrive(false);
          onClose();
        }}
        onSelect={handleFolderSelected}
      />
    </>
  );
};
