"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppData } from "../types";

export const AUTOSAVE_DEBOUNCE_MS = 3_000;

export type SaveTransmittalOptions = {
  isDraft: boolean;
  silent: boolean;
};

interface UseAutoSaveOptions {
  data: AppData;
  enabled: boolean;
  isDocumentProcessing: boolean;
  onSave: (
    dataSnapshot: AppData,
    options: SaveTransmittalOptions,
  ) => Promise<void>;
  debounceMs?: number;
}

interface UseAutoSaveReturn {
  dirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  markDirty: () => void;
  markClean: (options?: { resetLastSavedAt?: boolean }) => void;
  saveNow: (
    options: SaveTransmittalOptions,
    config?: { force?: boolean },
  ) => Promise<boolean>;
  waitForIdle: () => Promise<void>;
}

const AUTO_SAVE_OPTIONS: SaveTransmittalOptions = {
  isDraft: true,
  silent: true,
};

export const useAutoSave = ({
  data,
  enabled,
  isDocumentProcessing,
  onSave,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: UseAutoSaveOptions): UseAutoSaveReturn => {
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dataRef = useRef(data);
  const enabledRef = useRef(enabled);
  const processingRef = useRef(isDocumentProcessing);
  const onSaveRef = useRef(onSave);
  const debounceMsRef = useRef(debounceMs);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const generationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCountRef = useRef(0);
  const saveNowRef = useRef<UseAutoSaveReturn["saveNow"]>(async () => false);

  dataRef.current = data;
  enabledRef.current = enabled;
  processingRef.current = isDocumentProcessing;
  onSaveRef.current = onSave;
  debounceMsRef.current = debounceMs;

  const clearScheduledSave = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    clearScheduledSave();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void saveNowRef.current(AUTO_SAVE_OPTIONS).catch(() => {});
    }, debounceMsRef.current);
  }, [clearScheduledSave]);

  const saveNow = useCallback<UseAutoSaveReturn["saveNow"]>(
    async (options, config) => {
      const force = config?.force === true;
      clearScheduledSave();

      if (!force) {
        if (!dirtyRef.current || !enabledRef.current) return false;
        if (processingRef.current) {
          return false;
        }
      }

      const dataSnapshot = dataRef.current;
      const revision = revisionRef.current;
      const generation = generationRef.current;

      pendingCountRef.current += 1;
      setIsSaving(true);
      setSaveError(null);

      const execute = async () => {
        try {
          await onSaveRef.current(dataSnapshot, options);
          if (generation === generationRef.current) {
            savedRevisionRef.current = Math.max(
              savedRevisionRef.current,
              revision,
            );
            const hasNewerChanges =
              revisionRef.current > savedRevisionRef.current;
            dirtyRef.current = hasNewerChanges;
            setDirty(hasNewerChanges);
            setLastSavedAt(new Date());
            setSaveError(null);
          }
          return true;
        } catch (error) {
          if (generation === generationRef.current) {
            dirtyRef.current =
              revisionRef.current > savedRevisionRef.current;
            setDirty(dirtyRef.current);
            setSaveError(
              error instanceof Error ? error.message : "Unable to save draft",
            );
          }
          throw error;
        } finally {
          pendingCountRef.current = Math.max(0, pendingCountRef.current - 1);
          setIsSaving(pendingCountRef.current > 0);
        }
      };

      const queuedSave = queueRef.current.then(execute, execute);
      queueRef.current = queuedSave.then(
        () => undefined,
        () => undefined,
      );
      return queuedSave;
    },
    [clearScheduledSave, scheduleSave],
  );

  saveNowRef.current = saveNow;

  const markDirty = useCallback(() => {
    revisionRef.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveError(null);
    scheduleSave();
  }, [scheduleSave]);

  const markClean = useCallback(
    (options?: { resetLastSavedAt?: boolean }) => {
      clearScheduledSave();
      generationRef.current += 1;
      revisionRef.current = 0;
      savedRevisionRef.current = 0;
      dirtyRef.current = false;
      setDirty(false);
      setSaveError(null);
      if (options?.resetLastSavedAt !== false) {
        setLastSavedAt(null);
      }
    },
    [clearScheduledSave],
  );

  const waitForIdle = useCallback(() => queueRef.current, []);

  useEffect(() => {
    if (!isDocumentProcessing && dirtyRef.current && enabledRef.current) {
      scheduleSave();
    }
  }, [isDocumentProcessing, scheduleSave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !dirtyRef.current) return;
      void saveNowRef.current(AUTO_SAVE_OPTIONS).catch(() => {});
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      void saveNowRef.current(AUTO_SAVE_OPTIONS).catch(() => {});
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearScheduledSave();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [clearScheduledSave]);

  return {
    dirty,
    isSaving,
    lastSavedAt,
    saveError,
    markDirty,
    markClean,
    saveNow,
    waitForIdle,
  };
};
