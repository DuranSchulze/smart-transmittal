"use client";

import { getAgencyLogo } from "@/lib/agency-logo";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SenderInfo } from "../../types";

interface AgencyPresetModalProps {
  isOpen: boolean;
  isSaving?: boolean;
  isUploadingLogo?: boolean;
  saveError?: string | null;
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
  isSaving = false,
  isUploadingLogo = false,
  saveError,
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
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-feature animate-in zoom-in-95 duration-300 border border-divider">
        <div className="p-5 border-b border-divider flex justify-between items-center bg-fog">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              {isUpdateMode ? "Edit shared agency" : "Create agency"}
            </h3>
            <p className="text-xs font-medium text-helper mt-1">
              {isUpdateMode
                ? "Changes will be available to everyone using this agency."
                : "Save the company logo and details for everyone to use."}
            </p>
          </div>
          <Button
            onClick={onClose}
            disabled={isSaving || isImportingDriveLogo || isUploadingLogo}
            variant="ghost"
            size="icon"
            className="rounded-full text-helper hover:text-ink"
          >
            ✕
          </Button>
        </div>

        <fieldset disabled={isSaving || isImportingDriveLogo || isUploadingLogo} className="p-6 space-y-5">
          <div className="rounded-xl border border-royal/15 bg-wash p-3 text-xs leading-relaxed text-caption">This agency will be visible to all signed-in users. Add company information that is appropriate to share.</div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 shrink-0 rounded-lg border border-divider bg-white shadow-card flex items-center justify-center overflow-hidden">
              {getAgencyLogo(draft) ? (
                <img
                  src={getAgencyLogo(draft)!}
                  crossOrigin="anonymous"
                  alt="Agency logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs font-medium text-helper">
                  Logo
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-medium text-helper ml-2">
                Upload Logo
              </Label>
              <input
                type="file"
                aria-label="Upload agency logo"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onLogoUpload}
                className="block w-full mt-1 text-xs font-medium text-caption file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-royal file:text-white hover:file:bg-royal/90"
              />
              <p className="mt-2 text-[11px] text-helper">PNG, JPG, WebP, or GIF · up to 2 MB. Your logo uploads to ImageKit when you save the agency.</p>
              {getAgencyLogo(draft) && <button type="button" onClick={() => onChange({ ...draft, logoUrl: null, logoBase64: null })} className="mt-1 text-xs text-coral">Remove logo</button>}
            </div>
          </div>

          {draft.logoUrl && <div className="space-y-1.5 rounded-xl border border-divider bg-fog/50 p-3">
            <Label className="text-xs text-helper" htmlFor="agency-logo-url">Saved logo URL</Label>
            <Input id="agency-logo-url" readOnly value={draft.logoUrl} className="text-xs" />
            <a href={draft.logoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-royal">Open saved logo</a>
          </div>}

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
                maxLength={160}
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

          {saveError && <p role="alert" className="rounded-xl border border-coral/20 bg-coral/10 p-3 text-xs text-coral">{saveError}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              disabled={isSaving || isImportingDriveLogo || isUploadingLogo}
              variant="ghost"
              className="flex-1 rounded-full font-medium bg-fog text-caption hover:bg-fog/80"
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={!draft.agencyName.trim() || isSaving || isImportingDriveLogo}
              className="flex-[2] bg-royal text-white rounded-full text-xs font-medium shadow-card hover:bg-royal/90 disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isSaving ? "Saving agency…" : isUpdateMode ? "Save shared changes" : "Create agency"}
            </Button>
          </div>
        </fieldset>
      </div>
    </div>
  );
};
