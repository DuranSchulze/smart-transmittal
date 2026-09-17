"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { ProjectInfo } from "@/types";

type TransmittalValidationState = {
  normalizedValue: string;
  isDuplicate: boolean;
  conflictingTransmittalId: string | null;
  message: string;
};

interface ProjectTabProps {
  project: ProjectInfo;
  projectNameSuggestions: string[];
  departmentSuggestions: string[];
  onUpdateField: (section: "project", field: string, value: string) => void;
  transmittalValidation: TransmittalValidationState;
}

export const ProjectTab: React.FC<ProjectTabProps> = ({
  project,
  projectNameSuggestions,
  departmentSuggestions,
  onUpdateField,
  transmittalValidation,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-sm font-semibold text-ink mb-4">
        Project Parameters
      </h2>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Contract/Project Title
          </Label>
          <Combobox
            value={project.projectName || null}
            onValueChange={(value) =>
              onUpdateField("project", "projectName", String(value || ""))
            }
            inputValue={project.projectName}
            onInputValueChange={(value) =>
              onUpdateField("project", "projectName", value)
            }
          >
            <ComboboxInput
              className="w-full"
              placeholder="Enter project title"
            />
            <ComboboxContent>
              <ComboboxEmpty>No saved project titles yet.</ComboboxEmpty>
              <ComboboxList>
                {projectNameSuggestions.map((suggestion) => (
                  <ComboboxItem key={suggestion} value={suggestion}>
                    {suggestion}
                  </ComboboxItem>
                ))}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Project Number
          </Label>
          <Input
            className="font-mono text-xs"
            value={project.projectNumber}
            onChange={(e) =>
              onUpdateField("project", "projectNumber", e.target.value)
            }
            placeholder="Enter project reference number"
          />
          <p className="text-xs text-helper ml-2">
            Project-specific identifier (separate from Transmittal ID).
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Transmittal ID
          </Label>
          <Input
            className={`font-mono text-xs transition-all ${
              transmittalValidation.isDuplicate
                ? "border-coral/20 bg-coral/10 text-coral ring-2 ring-coral/30 focus-visible:ring-coral/40"
                : ""
            }`}
            value={project.transmittalNumber}
            onChange={(e) =>
              onUpdateField("project", "transmittalNumber", e.target.value)
            }
            placeholder="Auto-generated (e.g. 202602-0001)"
          />
          {transmittalValidation.isDuplicate ? (
            <p className="text-xs text-coral ml-2 font-medium">
              {transmittalValidation.message}
            </p>
          ) : (
            <p className="text-xs text-helper ml-2">
              Auto-generated document number for this transmittal. Editable, but
              must stay unique across all transmittals.
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Purpose
          </Label>
          <Input
            value={project.purpose}
            onChange={(e) =>
              onUpdateField("project", "purpose", e.target.value)
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Department
          </Label>
          <div className="flex gap-2">
            <Combobox
              value={project.department || null}
              onValueChange={(value) =>
                onUpdateField("project", "department", String(value || ""))
              }
              inputValue={project.department}
              onInputValueChange={(value) =>
                onUpdateField("project", "department", value)
              }
            >
              <ComboboxInput
                className="w-full"
                placeholder="Enter department"
              />
              <ComboboxContent>
                <ComboboxEmpty>No saved departments yet.</ComboboxEmpty>
                <ComboboxList>
                  {departmentSuggestions.map((suggestion) => (
                    <ComboboxItem key={suggestion} value={suggestion}>
                      {suggestion}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Button
              type="button"
              variant="outline"
              onClick={() => onUpdateField("project", "department", "Admin")}
              className="whitespace-nowrap"
            >
              Use Admin
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
