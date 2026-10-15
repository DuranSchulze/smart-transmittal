"use client";

import React from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Signatories } from "@/types";

const formatTime24hTo12h = (time24h: string): string => {
  const match = time24h.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = match[2];
  const minutesNum = Number(minutes);
  if (
    !Number.isFinite(hours) ||
    hours < 0 ||
    hours > 23 ||
    !Number.isFinite(minutesNum) ||
    minutesNum < 0 ||
    minutesNum > 59
  )
    return "";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
};

const parseTimeTo24h = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const direct24h = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (direct24h) {
    const h = Number(direct24h[1]);
    const m = Number(direct24h[2]);
    if (
      Number.isFinite(h) &&
      Number.isFinite(m) &&
      h >= 0 &&
      h <= 23 &&
      m >= 0 &&
      m <= 59
    ) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return "";
  }

  const match12h = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match12h) return "";

  let hours = Number(match12h[1]);
  const minutes = Number(match12h[2]);
  const ampm = match12h[3].toUpperCase();

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 1 ||
    hours > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return "";
  }

  if (ampm === "AM") {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

interface SignatoriesTabProps {
  signatories: Signatories;
  preparedBySuggestions: string[];
  preparedByRoleSuggestions: string[];
  notedBySuggestions: string[];
  notedByRoleSuggestions: string[];
  onUpdateSignatory: (field: keyof Signatories, value: string) => void;
}

type SuggestionInputProps = {
  value: string;
  suggestions: string[];
  placeholder: string;
  onChange: (value: string) => void;
};

const SuggestionInput: React.FC<SuggestionInputProps> = ({
  value,
  suggestions,
  placeholder,
  onChange,
}) => {
  return (
    <Combobox
      value={value || null}
      onValueChange={(nextValue) => onChange(String(nextValue || ""))}
      inputValue={value}
      onInputValueChange={onChange}
    >
      <ComboboxInput className="w-full" placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>No saved suggestions yet.</ComboboxEmpty>
        <ComboboxList>
          {suggestions.map((suggestion) => (
            <ComboboxItem key={suggestion} value={suggestion}>
              {suggestion}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export const SignatoriesTab: React.FC<SignatoriesTabProps> = ({
  signatories,
  preparedBySuggestions,
  preparedByRoleSuggestions,
  notedBySuggestions,
  notedByRoleSuggestions,
  onUpdateSignatory,
}) => {
  const setCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    onUpdateSignatory("timeReleased", formatTime24hTo12h(`${hours}:${minutes}`));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-sm font-semibold text-ink mb-4">
        Signatories & Auth
      </h2>
      <div className="space-y-6">
        <div className="p-5 bg-fog rounded-2xl border border-divider space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-caption ml-2">
              Prepared By Name
            </Label>
            <SuggestionInput
              value={signatories.preparedBy}
              suggestions={preparedBySuggestions}
              placeholder="Enter prepared by name"
              onChange={(value) => onUpdateSignatory("preparedBy", value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-caption ml-2">
              Prepared By Role
            </Label>
            <SuggestionInput
              value={signatories.preparedByRole}
              suggestions={preparedByRoleSuggestions}
              placeholder="Enter prepared by role"
              onChange={(value) => onUpdateSignatory("preparedByRole", value)}
            />
          </div>
        </div>
        <div className="p-5 bg-fog rounded-2xl border border-divider space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-caption ml-2">
              Noted By Name
            </Label>
            <SuggestionInput
              value={signatories.notedBy}
              suggestions={notedBySuggestions}
              placeholder="Enter noted by name"
              onChange={(value) => onUpdateSignatory("notedBy", value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-caption ml-2">
              Noted By Role
            </Label>
            <SuggestionInput
              value={signatories.notedByRole}
              suggestions={notedByRoleSuggestions}
              placeholder="Enter noted by role"
              onChange={(value) => onUpdateSignatory("notedByRole", value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-caption ml-2">
            Time Released
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              step={60}
              value={parseTimeTo24h(signatories.timeReleased)}
              onChange={(e) =>
                onUpdateSignatory("timeReleased", formatTime24hTo12h(e.target.value))
              }
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={setCurrentTime}
              className="h-9 shrink-0 rounded-full px-3 text-xs"
              title="Use the current time"
            >
              <Clock className="h-3.5 w-3.5" />
              Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
