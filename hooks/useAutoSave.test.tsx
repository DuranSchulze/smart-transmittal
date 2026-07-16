import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppData } from "../types";
import { useAutoSave } from "./useAutoSave";

const createData = (notes = ""): AppData => ({
  recipient: {
    to: "",
    email: "",
    company: "",
    attention: "",
    address: "",
    contactNumber: "",
  },
  project: {
    projectName: "",
    projectNumber: "",
    engagementRef: "",
    purpose: "",
    transmittalNumber: "202607-0001",
    department: "Admin",
    date: "2026-07-15",
    timeGenerated: "10:00",
  },
  items: [],
  sender: {
    agencyName: "FILEPINO",
    addressLine1: "",
    addressLine2: "",
    website: "",
    mobile: "",
    telephone: "",
    email: "",
    logoBase64: null,
  },
  signatories: {
    preparedBy: "",
    preparedByRole: "",
    notedBy: "",
    notedByRole: "",
    timeReleased: "",
  },
  receivedBy: { name: "", date: "", time: "", remarks: "" },
  footerNotes: { acknowledgement: "", disclaimer: "" },
  notes,
  transmissionMethod: {
    personalDelivery: false,
    pickUp: false,
    grabLalamove: false,
    registeredMail: false,
  },
});

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces rapid edits into one draft save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) =>
        useAutoSave({
          data,
          enabled: true,
          isDocumentProcessing: false,
          onSave,
          debounceMs: 3_000,
        }),
      { initialProps: { data: createData() } },
    );

    act(() => {
      result.current.markDirty();
      result.current.markDirty();
    });
    rerender({ data: createData("latest edit") });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ notes: "latest edit" }),
      { isDraft: true, silent: true },
    );
    expect(result.current.dirty).toBe(false);
  });

  it("waits until document processing finishes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ processing }) =>
        useAutoSave({
          data: createData("imported"),
          enabled: true,
          isDocumentProcessing: processing,
          onSave,
          debounceMs: 3_000,
        }),
      { initialProps: { processing: true } },
    );

    act(() => result.current.markDirty());
    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(onSave).not.toHaveBeenCalled();

    rerender({ processing: false });
    await act(async () => vi.advanceTimersByTimeAsync(3_000));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("keeps changes dirty and exposes an error when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    const { result } = renderHook(() =>
      useAutoSave({
        data: createData("unsaved"),
        enabled: true,
        isDocumentProcessing: false,
        onSave,
        debounceMs: 3_000,
      }),
    );

    act(() => result.current.markDirty());
    await act(async () => vi.advanceTimersByTimeAsync(3_000));

    expect(result.current.dirty).toBe(true);
    expect(result.current.saveError).toBe("Network unavailable");
  });

  it("flushes immediately when the page becomes hidden", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const { result } = renderHook(() =>
      useAutoSave({
        data: createData("hidden page edit"),
        enabled: true,
        isDocumentProcessing: false,
        onSave,
        debounceMs: 3_000,
      }),
    );

    act(() => result.current.markDirty());
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.dirty).toBe(false);
  });

  it("blocks beforeunload while changes are dirty and starts a final flush", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({
        data: createData("close warning edit"),
        enabled: true,
        isDocumentProcessing: false,
        onSave,
        debounceMs: 3_000,
      }),
    );

    act(() => result.current.markDirty());
    const event = new Event("beforeunload", {
      bubbles: false,
      cancelable: true,
    });

    await act(async () => {
      window.dispatchEvent(event);
      await Promise.resolve();
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
