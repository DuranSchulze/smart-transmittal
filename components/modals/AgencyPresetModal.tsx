"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SenderInfo } from "../../types";

interface AgencyPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "update";
  isDriveReady: boolean;
  draft: SenderInfo;
  onChange: (next: SenderInfo) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  driveLogoLink: string;
  onDriveLogoLinkChange: (value: string) => void;
  onImportDriveLogo: () => void;
  isImportingDriveLogo: boolean;
  onSave: () => void;
}

export const AgencyPresetModal: React.FC<AgencyPresetModalProps> = ({
  isOpen,
  onClose,
  mode,
  isDriveReady,
  draft,
  onChange,
  onLogoUpload,
  driveLogoLink,
  onDriveLogoLinkChange,
  onImportDriveLogo,
  isImportingDriveLogo,
  onSave,
}) => {
  if (!isOpen) return null;

  const isUpdateMode = mode === "update";

  return (
    <div className="fixed inset-0 z-[102] flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-feature overflow-hidden animate-in zoom-in-95 duration-300 border border-divider">
        <div className="p-5 border-b border-divider flex justify-between items-center bg-fog">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              {isUpdateMode ? "Update Agency / Brand" : "Add Agency / Brand"}
            </h3>
            <p className="text-xs font-medium text-helper mt-1">
              {isUpdateMode
                ? "Edit the selected agency details"
                : "Save presets for quick reuse"}
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

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-divider bg-white shadow-card flex items-center justify-center overflow-hidden">
              {draft.logoBase64 ? (
                <img
                  src={draft.logoBase64}
                  alt="Agency logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-medium text-helper">
                  Logo
                </span>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Upload Logo
              </Label>
              <input
                type="file"
                accept="image/*"
                onChange={onLogoUpload}
                className="block w-full mt-1 text-xs font-medium text-caption file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-royal file:text-white hover:file:bg-royal/90"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-helper ml-2">
              Import Logo from Google Drive
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={driveLogoLink}
                onChange={(e) => onDriveLogoLinkChange(e.target.value)}
                placeholder="Paste Google Drive image file link..."
                disabled={isImportingDriveLogo}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onImportDriveLogo}
                disabled={
                  !isDriveReady || !driveLogoLink.trim() || isImportingDriveLogo
                }
                className="rounded-full text-xs font-medium border-royal/60 bg-white text-royal hover:bg-royal/5 hover:text-royal"
              >
                {isImportingDriveLogo ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Importing
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
            {!isDriveReady ? (
              <p className="text-xs text-helper px-1">
                Connect Google Drive first to import logo links.
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Agency Name
              </Label>
              <Input
                value={draft.agencyName}
                onChange={(e) =>
                  onChange({ ...draft, agencyName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Address Line 1
              </Label>
              <Input
                value={draft.addressLine1}
                onChange={(e) =>
                  onChange({ ...draft, addressLine1: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Address Line 2
              </Label>
              <Input
                value={draft.addressLine2}
                onChange={(e) =>
                  onChange({ ...draft, addressLine2: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Website
              </Label>
              <Input
                value={draft.website}
                onChange={(e) =>
                  onChange({ ...draft, website: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-helper ml-2">
                  Telephone
                </Label>
                <Input
                  value={draft.telephone}
                  onChange={(e) =>
                    onChange({ ...draft, telephone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-helper ml-2">
                  Mobile
                </Label>
                <Input
                  value={draft.mobile}
                  onChange={(e) =>
                    onChange({ ...draft, mobile: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Email
              </Label>
              <Input
                value={draft.email}
                onChange={(e) => onChange({ ...draft, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 rounded-full font-medium bg-fog text-caption hover:bg-fog/80"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!draft.agencyName.trim()}
              className="flex-[2] bg-royal text-white rounded-full text-xs font-medium shadow-card hover:bg-royal/90 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isUpdateMode ? "Update Agency" : "Save Agency"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
