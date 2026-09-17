"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDriveLink: (link: string) => Promise<void> | void;
}

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  isOpen,
  onClose,
  onImportDriveLink,
}) => {
  const [driveLink, setDriveLink] = useState("");
  const [isSubmittingDrive, setIsSubmittingDrive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-feature overflow-hidden animate-in zoom-in-95 duration-300 border border-divider">
        <div className="p-5 border-b border-divider flex justify-between items-center bg-fog">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              Bulk Import
            </h3>
            <p className="text-xs font-medium text-helper mt-1">
              Import from a Google Drive folder
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full text-helper hover:text-ink"
          >
            ✕
          </Button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <Input
              placeholder="Paste Google Drive folder link..."
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              autoFocus
            />
            <p className="text-xs font-medium text-helper">
              Imports all files in the folder
            </p>
          </div>

          {errorMsg ? (
            <div className="mt-4 rounded-lg border border-coral/20 bg-coral/10 p-4 text-sm text-coral">
              <div className="font-medium">Import failed</div>
              <div className="mt-1 break-words">{errorMsg}</div>
              <div className="mt-2 text-xs text-coral">
                Make sure you pasted a folder link (not a file), and that you're
                signed in with Drive access.
              </div>
            </div>
          ) : null}

          {statusMsg ? (
            <div className="mt-4 rounded-lg border border-divider bg-fog p-4 text-sm text-caption">
              {statusMsg}
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 rounded-full font-medium bg-fog text-caption hover:bg-fog/80"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!driveLink.trim()) return;
                try {
                  setIsSubmittingDrive(true);
                  setErrorMsg("");
                  setStatusMsg("Fetching files from Drive...");
                  await onImportDriveLink(driveLink);
                  setDriveLink("");
                  setStatusMsg("");
                  onClose();
                } catch (e: any) {
                  setStatusMsg("");
                  setErrorMsg(e?.message || "Import failed.");
                } finally {
                  setIsSubmittingDrive(false);
                }
              }}
              disabled={!driveLink.trim() || isSubmittingDrive}
              className="flex-[2] rounded-full font-medium shadow-card"
            >
              Import From Drive
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
