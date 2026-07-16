"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { HelpCircle, Pencil, Eye, Loader2, AlertCircle, CheckCircle2, X as XIcon } from "lucide-react";
import { FloatingAccount } from "../account/FloatingAccount";
import { BulkAddModal } from "../modals/BulkAddModal";
import { AgencyPresetModal } from "../modals/AgencyPresetModal";
import { DriveFileModal } from "../modals/DriveFileModal";
import { DocxPreviewModal } from "../modals/DocxPreviewModal";
import { ErrorBoundary } from "../common/ErrorBoundary";
import {
  checkDriveAccess,
  clearGoogleToken,
} from "../../services/googleDriveService";
import { useTransmittalDraft } from "../../hooks/useTransmittalDraft";
import { useTransmittalPersistence } from "../../hooks/useTransmittalPersistence";
import { useOnboarding } from "../../hooks/useOnboarding";
import { useAgencyManager } from "../../hooks/useAgencyManager";
import { useDocumentParsing } from "../../hooks/useDocumentParsing";
import { useDriveImport } from "../../hooks/useDriveImport";
import { useSmartImport } from "../../hooks/useSmartImport";
import { useExport } from "../../hooks/useExport";
import { usePreviewControls } from "../../hooks/usePreviewControls";
import { authClient, signIn, signOut, useSession } from "../../lib/auth-client";
import { friendlyError } from "../../lib/friendlyError";
import { OPEN_ALL_TRANSMITTALS_ENABLED } from "../../lib/features";
import {
  AppData,
  TransmittalItem,
  Signatories,
  ReceivedBy,
  FooterNotes,
  type WorkspaceSection,
} from "../../types";
import { computeWorkspaceProgress } from "../../lib/workspace-progress";
import type { ParseResult } from "../../services/geminiService";

// Modular UI components
import { LoadingScreen } from "./LoadingScreen";
import { LoginScreen } from "./LoginScreen";
import { SidebarMenuBar } from "./SidebarFooter";
import { WorkspaceNavigation } from "./navigation/WorkspaceNavigation";
import { FilesPanel } from "./panels/FilesPanel";
import { DeliveryPanel } from "./panels/DeliveryPanel";
import { ReviewPanel } from "./panels/ReviewPanel";
import { SenderTab } from "./tabs/SenderTab";
import { RecipientTab } from "./tabs/RecipientTab";
import { ProjectTab } from "./tabs/ProjectTab";
import { SignatoriesTab } from "./tabs/SignatoriesTab";
import { TransmittalListModal } from "../modals/TransmittalListModal";
import { ExportChoiceModal } from "../modals/ExportChoiceModal";
import { FolderPickerModal } from "../modals/FolderPickerModal";
import { FileUploadModal } from "../modals/FileUploadModal";
import { PreviewPanel } from "./PreviewPanel";
import {
  OnboardingTour,
  type TourStep,
  type TourStepItem,
} from "../onboarding/OnboardingTour";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import tourStepsRaw from "../../data/onboarding-steps.json";
import fileMenuItemsRaw from "../../data/file-menu-items.json";

const FILE_MENU_ITEMS: TourStepItem[] = (
  fileMenuItemsRaw as TourStepItem[]
).filter(
  (item) => OPEN_ALL_TRANSMITTALS_ENABLED || item.id !== "open-all",
);

const TOUR_STEPS: TourStep[] = (tourStepsRaw as TourStep[]).map((step) =>
  step.id === "file-menu" ? { ...step, items: FILE_MENU_ITEMS } : step,
);

const resolveSessionErrorNotice = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const typedError = error as {
    status?: number;
    statusText?: string;
    message?: string;
    error?: { message?: string; code?: string } | string;
  };

  const nestedError =
    typeof typedError.error === "string"
      ? typedError.error
      : `${typedError.error?.message || ""} ${typedError.error?.code || ""}`.trim();

  const details = [typedError.message, typedError.statusText, nestedError]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const status = Number(typedError.status || 0);
  const likelyConnectivityIssue =
    status >= 500 ||
    /unable to connect|network|dns|accelerate|failed to fetch|timeout|please_restart_the_process|internal_server_error/.test(
      details,
    );

  if (likelyConnectivityIssue) {
    return "Session check failed due to a temporary connection issue (internet, DNS, or server). Please check your connection and sign in again.";
  }

  if (status === 401 || status === 403) {
    return "Your session has expired. Please sign in again.";
  }

  return "We could not restore your session. Please sign in again.";
};

const AppContent: React.FC = () => {
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"info" | "error">("info");
  const [authSignInError, setAuthSignInError] = useState<string>();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>("files");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isTransmittalListOpen, setIsTransmittalListOpen] = useState(false);
  const [transmittalListScope, setTransmittalListScope] =
    useState<"mine" | "all">("mine");
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [fileUploadInitialFiles, setFileUploadInitialFiles] = useState<File[]>([]);
  const { data, setData, hasFormData } = useTransmittalDraft();
  const {
    isGeneratingPdf,
    isGeneratingDocx,
    isPreviewModalOpen,
    setIsPreviewModalOpen,
    docxPreviewHtml,
    exportChoiceOpen,
    pendingExportFormat,
    pendingExportFileName,
    isUploadingToDrive,
    exportFolderPickerOpen,
    exportPdf: handlePrint,
    exportDocx: handleDownloadDocx,
    previewDocx: handlePreviewDocx,
    exportCsv: handleExportCSV,
    downloadLocal: handleExportLocalDownload,
    uploadToDrive: handleExportUploadToDrive,
    closeChoice: handleCloseExportChoice,
    closeFolderPicker: handleCloseExportFolderPicker,
    selectFolder: handleFolderSelected,
  } = useExport({
    data,
    onStatus: (message, type) => {
      setStatusMsg(message);
      setStatusType(type);
    },
  });
  const [showPreview, setShowPreview] = useState(false);
  const workspaceProgress = useMemo(
    () => computeWorkspaceProgress(data),
    [data],
  );

  const [driveAvailability, setDriveAvailability] = useState<
    "unknown" | "ready" | "unavailable"
  >("unknown");
  const driveCheckRef = useRef<Promise<boolean> | null>(null);
  const isDriveReady = driveAvailability === "ready";
  const canUseDrive = driveAvailability !== "unavailable";
  const ensureDriveReady = useCallback(async () => {
    if (driveAvailability === "ready") return true;
    if (driveCheckRef.current) return driveCheckRef.current;
    const request = checkDriveAccess()
      .then((ready) => {
        setDriveAvailability(ready ? "ready" : "unavailable");
        return ready;
      })
      .finally(() => {
        driveCheckRef.current = null;
      });
    driveCheckRef.current = request;
    return request;
  }, [driveAvailability]);
  const {
    columnWidths,
    zoomPercent,
    previewScale,
    previewContainerRef,
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    resetZoom: handleZoomReset,
    setZoom: handleZoomSet,
    resizeDivider: handleResizeDivider,
    resetColumnWidths: handleResetColumnWidths,
  } = usePreviewControls(showPreview);

  const { data: session, isPending, error: sessionError } = useSession();
  const apiBaseUrl =
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "";
  const sessionErrorNotice = resolveSessionErrorNotice(sessionError);
  const {
    isTourOpen,
    tourStep,
    isAiPromptOpen,
    setIsAiPromptOpen,
    nextTourStep,
    previousTourStep,
    skipTour,
    finishTour,
    startTour,
    dismissAiPrompt,
  } = useOnboarding({ userId: session?.user?.id, apiBaseUrl });

  const handleGoogleSignIn = async () => {
    setAuthSignInError(undefined);
    try {
      await authClient.signIn.oauth2({
        providerId: "google",
        callbackURL: window.location.origin,
      });
    } catch (error) {
      setAuthSignInError(
        friendlyError(
          error,
          "Google sign-in could not connect. Check the server and try again.",
        ),
      );
    }
  };

  const handleDDSSignIn = async () => {
    setAuthSignInError(undefined);
    try {
      await authClient.signIn.oauth2({
        providerId: "google-dds",
        callbackURL: window.location.origin,
      });
    } catch (error) {
      setAuthSignInError(
        friendlyError(
          error,
          "DDS sign-in could not connect. Check the server and try again.",
        ),
      );
    }
  };

  const handleSignOut = async () => {
    if (dirty) {
      try {
        await saveNow({ isDraft: true, silent: true });
      } catch (error) {
        setStatusMsg(
          friendlyError(error, "Couldn't save your draft. Sign out was cancelled."),
        );
        setStatusType("error");
        return;
      }
    }
    await waitForIdle();
    await clearGoogleToken();
    setDriveAvailability("unknown");
    await signOut();
  };

  const handleAiPromptYes = () => {
    setIsAiPromptOpen(false);
    window.dispatchEvent(new Event("open-ai-settings"));
  };

  const handleAiPromptNo = () => {
    dismissAiPrompt();
    setStatusType("info");
    setStatusMsg(
      "The system will use the system's existing AI keys, but you can still add your API key later on.",
    );
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const updateField = (
    section: "recipient" | "project" | "sender",
    field: string,
    value: string,
  ) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleUpdateNotes = (value: string) => {
    markDirty();
    setData((prev) => ({ ...prev, notes: value }));
  };
  const handleUpdateSignatory = (field: keyof Signatories, value: string) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      signatories: { ...prev.signatories, [field]: value },
    }));
  };
  const handleUpdateReceivedBy = (field: keyof ReceivedBy, value: string) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      receivedBy: { ...prev.receivedBy, [field]: value },
    }));
  };
  const handleUpdateFooter = (field: keyof FooterNotes, value: string) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      footerNotes: { ...prev.footerNotes, [field]: value },
    }));
  };
  const updateTransmission = (method: string, checked: boolean) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      transmissionMethod: { ...prev.transmissionMethod, [method]: checked },
    }));
  };

  const reindexItems = (items: TransmittalItem[]): TransmittalItem[] =>
    items.map((item, index) => ({
      ...item,
      noOfItems: (index + 1).toString(),
    }));
  const addItems = (newItems: TransmittalItem[]) => {
    if (newItems.length === 0) return;
    markDirty();
    setData((prev) => ({
      ...prev,
      items: reindexItems([...prev.items, ...newItems]),
    }));
  };

  const {
    isDriveModalOpen,
    setIsDriveModalOpen,
    driveFiles,
    driveSearch,
    setDriveSearch,
    driveSelected,
    driveError,
    isDriveLoading,
    isBulkImporting,
    isDriveSelectionImporting,
    importFilesWithAi: importDriveFilesWithAi,
    importFolderLink: handleBulkImportDriveLink,
    openModal: openDriveModal,
    search: handleDriveSearch,
    toggle: handleDriveToggle,
    toggleAll: handleDriveToggleAll,
    addSelected: handleDriveAddSelected,
  } = useDriveImport({
    apiBaseUrl,
    isDriveReady: canUseDrive,
    addItems,
    onStatus: (message, type) => {
      setStatusMsg(message);
      setStatusType(type);
    },
  });

  const handleOpenDriveModal = useCallback(async () => {
    if (await ensureDriveReady()) {
      openDriveModal();
      return;
    }
    setStatusType("error");
    setStatusMsg("Google Drive is unavailable. Sign in again to reconnect it.");
  }, [ensureDriveReady, openDriveModal]);

  const {
    smartInput,
    setSmartInput,
    isAnalyzingText,
    analyze: handleSmartAnalysis,
  } = useSmartImport({
    isDriveReady: canUseDrive,
    addItems,
    importDriveFiles: importDriveFilesWithAi,
    onStatus: (message, type) => {
      setStatusMsg(message);
      setStatusType(type);
    },
  });

  const mergeHeaderData = (header: ParseResult["header"]) => {
    if (!header) return;
    markDirty();
    setData((prev) => ({
      ...prev,
      recipient: {
        ...prev.recipient,
        to: header.recipientName || prev.recipient.to,
        email: header.recipientEmail || prev.recipient.email,
        company: header.companyName || prev.recipient.company,
        address: header.address || prev.recipient.address,
      },
      project: {
        ...prev.project,
        projectName: header.projectName || prev.project.projectName,
        projectNumber: header.projectNumber || prev.project.projectNumber,
        purpose: header.purpose || prev.project.purpose,
      },
    }));
  };

  const handleManualAdd = () =>
    addItems([
      {
        id: Date.now().toString() + Math.random(),
        qty: "1",
        noOfItems: "0",
        documentNumber: "",
        description: "",
        remarks: "",
        fileType: "link",
      },
    ]);

  const updateItem = (
    index: number,
    field: keyof TransmittalItem,
    value: string,
  ) => {
    markDirty();
    setData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const adjustItemQty = (index: number, delta: number) => {
    markDirty();
    setData((prev) => {
      const newItems = [...prev.items];
      const item = newItems[index];
      if (!item) return prev;

      const currentQty = Number.parseInt(String(item.qty || "").trim(), 10);
      const baseQty =
        Number.isFinite(currentQty) && currentQty > 0 ? currentQty : 1;
      const nextQty = Math.max(1, baseQty + delta);

      newItems[index] = {
        ...item,
        qty: String(nextQty),
      };

      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    markDirty();
    setData((prev) => ({
      ...prev,
      items: reindexItems(prev.items.filter((_, i) => i !== index)),
    }));
  };
  const moveItem = (index: number, direction: "up" | "down") => {
    markDirty();
    setData((prev) => {
      const newItems = [...prev.items];
      if (direction === "up" && index > 0)
        [newItems[index], newItems[index - 1]] = [
          newItems[index - 1],
          newItems[index],
        ];
      else if (direction === "down" && index < newItems.length - 1)
        [newItems[index], newItems[index + 1]] = [
          newItems[index + 1],
          newItems[index],
        ];
      return { ...prev, items: reindexItems(newItems) };
    });
  };

  const handleReorderItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    markDirty();
    setData((prev) => {
      const newItems = [...prev.items];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return { ...prev, items: reindexItems(newItems) };
    });
  };

  const {
    processUploadedFiles,
    isParsing,
    parseProgress,
  } = useDocumentParsing({
    apiBaseUrl,
    addItems,
    mergeHeader: mergeHeaderData,
    onStatus: (message, type) => {
      setStatusMsg(message);
      setStatusType(type);
      setTimeout(() => setStatusMsg(""), type === "error" ? 7000 : 5000);
    },
  });

  const handleUploadFiles = (files: File[]) => {
    void processUploadedFiles(files);
  };

  const handleSaveTransmittal = async () => {
    const isEditing = Boolean(activeTransmittalId);
    if (transmittalNumberValidation.isDuplicate) {
      setActiveSection("project");
      setStatusMsg(transmittalNumberValidation.message);
      setStatusType("error");
      setTimeout(() => setStatusMsg(""), 5000);
      return;
    }
    try {
      await saveNow({ isDraft: false, silent: false }, { force: true });
      setStatusMsg(isEditing ? "Transmittal updated" : "Transmittal saved");
      setStatusType("info");
    } catch (e: any) {
      setStatusMsg(friendlyError(e, "Couldn't save your transmittal."));
      setStatusType("error");
    }
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleRetryAutoSave = async () => {
    try {
      await saveNow(
        { isDraft: true, silent: false },
        { force: true },
      );
      setStatusType("info");
      setStatusMsg("Draft saved automatically");
    } catch (error) {
      setStatusType("error");
      setStatusMsg(friendlyError(error, "Autosave retry failed."));
    }
  };

  const handleSendEmail = () => {
    if (!data.recipient.email) {
      setStatusMsg("Add Recipient Email first.");
      setStatusType("error");
      setTimeout(() => setStatusMsg(""), 3000);
      return;
    }
    const subject = encodeURIComponent(
      `Transmittal: ${data.project.projectName} - ${data.project.transmittalNumber}`,
    );
    const body = encodeURIComponent(
      `Dear ${data.recipient.to},\n\nPlease find the attached transmittal for your documents.\n\nBest regards,\n${data.sender.agencyName}`,
    );
    window.open(
      `mailto:${data.recipient.email}?subject=${subject}&body=${body}`,
      "_blank",
    );
  };

  const isDocumentProcessing =
    isParsing || isBulkImporting || isDriveSelectionImporting;

  const {
    activeTransmittalId,
    activeTransmittalIsDraft,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    loadSuggestions,
    numberValidation: transmittalNumberValidation,
    openTransmittal,
    copyTransmittal,
    removeTransmittal,
    resetDraft,
    newTransmittal,
    dirty,
    isSaving,
    lastSavedAt,
    saveError,
    markDirty,
    saveNow,
    waitForIdle,
  } = useTransmittalPersistence({
    data,
    setData,
    hasFormData,
    isDocumentProcessing,
    userId: session?.user?.id,
    apiBaseUrl,
  });

  const {
    agencies,
    isLoadingAgencies,
    agencyLoadError,
    loadAgencies,
    selectedAgencyId,
    selectAgency: handleSelectAgency,
    isAgencyModalOpen,
    setIsAgencyModalOpen,
    agencyDraft,
    setAgencyDraft,
    agencyDriveLogoLink,
    setAgencyDriveLogoLink,
    isImportingAgencyDriveLogo,
    agencyModalMode,
    openModal: openAgencyModal,
    uploadLogo: handleAgencyLogoUpload,
    importDriveLogo: handleAgencyDriveLogoImport,
    save: saveAgencyPreset,
    remove: handleDeleteAgency,
  } = useAgencyManager({
    data,
    setData,
    markDirty,
    userId: session?.user?.id,
    apiBaseUrl,
    isDriveReady: canUseDrive,
    onStatus: (message, type) => {
      setStatusMsg(message);
      setStatusType(type);
      setTimeout(() => setStatusMsg(""), type === "error" ? 7000 : 3000);
    },
  });

  useEffect(() => {
    if (activeSection !== "project" && activeSection !== "signoff") return;
    void loadSuggestions().catch(() => undefined);
  }, [activeSection, loadSuggestions]);

  useEffect(() => {
    if (activeSection !== "sender") return;
    void loadAgencies().catch(() => undefined);
  }, [activeSection, loadAgencies]);

  const handleOpenTransmittal = async (id: string) => {
    try {
      await openTransmittal(id);
      setActiveSection("review");
      setStatusMsg("Transmittal loaded");
      setStatusType("info");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (error) {
      setStatusMsg(friendlyError(error, "Couldn't open that transmittal."));
      setStatusType("error");
      setTimeout(() => setStatusMsg(""), 7000);
    }
  };

  const handleCopyTransmittal = async (id: string) => {
    try {
      await copyTransmittal(id);
      setActiveSection("project");
      setIsTransmittalListOpen(false);
      setStatusMsg("Transmittal copied as new draft");
      setStatusType("info");
      setTimeout(() => setStatusMsg(""), 4000);
    } catch (error) {
      setStatusMsg(friendlyError(error, "Couldn't duplicate the transmittal."));
      setStatusType("error");
      setTimeout(() => setStatusMsg(""), 7000);
    }
  };

  const handleDeleteTransmittal = (id: string) => removeTransmittal(id);

  const handleNewTransmittal = async () => {
    try {
      await newTransmittal();
      setStatusMsg("New transmittal ready");
      setStatusType("info");
      setTimeout(() => setStatusMsg(""), 3000);
    } catch (error) {
      setStatusMsg(
        friendlyError(
          error,
          "Couldn't save the current draft. The form was not reset.",
        ),
      );
      setStatusType("error");
    }
  };

  const clearWorkspace = async () => {
    await resetDraft();
    setStatusMsg("Form Reset");
    setStatusType("info");
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const documentProcessingStatus = isParsing
    ? parseProgress.total > 0
      ? `Parsing ${parseProgress.current}/${parseProgress.total} file(s)...`
      : "Processing uploaded files..."
    : statusMsg ||
      (isBulkImporting
        ? "Bulk importing files from Google Drive..."
        : "Importing selected files from Google Drive...");

  const openFileLibrary = useCallback((scope: "mine" | "all") => {
    if (scope === "all" && !OPEN_ALL_TRANSMITTALS_ENABLED) return;
    setTransmittalListScope(scope);
    setIsTransmittalListOpen(true);
  }, []);

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!session?.user) {
    return (
      <LoginScreen
        onGoogleSignIn={handleGoogleSignIn}
        onDDSSignIn={handleDDSSignIn}
        authNotice={authSignInError || sessionErrorNotice}
      />
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-100 font-sans selection:bg-brand-500/20">
      {isDocumentProcessing ? (
        <div className="pointer-events-none fixed left-1/2 top-5 z-[130] w-[min(92vw,560px)] -translate-x-1/2">
          <div className="rounded-2xl border border-brand-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-brand-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-700">
                  Processing files
                </p>
                <p className="mt-1 text-xs text-slate-600 break-words">
                  {documentProcessingStatus}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <header data-tour="workspace-header" className="z-40 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white shadow-sm">
        <div className="flex h-full w-[68px] shrink-0 items-center justify-center border-r border-slate-200">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-base font-black text-white shadow-sm"
            title="Smart Transmittal"
            aria-label="Smart Transmittal"
          >
            T
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isDriveReady ? "bg-emerald-500" : "bg-slate-400"}`}
              title={
                driveAvailability === "ready"
                  ? "Drive connected"
                  : driveAvailability === "unavailable"
                    ? "Drive unavailable"
                    : "Drive checks when first used"
              }
            />
          </div>
        </div>
        <SidebarMenuBar
          onNewTransmittal={handleNewTransmittal}
          onOpenFileLibrary={openFileLibrary}
          onSaveTransmittal={handleSaveTransmittal}
          isEditingTransmittal={Boolean(activeTransmittalId)}
          transmittalNumber={data.project.transmittalNumber}
          hasUnsavedChanges={dirty}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
          onRetryAutoSave={handleRetryAutoSave}
          isDraft={activeTransmittalIsDraft}
          onExportPdf={handlePrint}
          onExportDocx={handleDownloadDocx}
          onExportCsv={handleExportCSV}
          onSendEmail={handleSendEmail}
          onPreviewDocx={handlePreviewDocx}
          onOpenAiSettings={() => window.dispatchEvent(new Event("open-ai-settings"))}
          onSignOut={handleSignOut}
          onResetWorkspace={clearWorkspace}
          isGeneratingPdf={isGeneratingPdf}
          isGeneratingDocx={isGeneratingDocx}
        />
        <button
          type="button"
          onClick={startTour}
          className="mr-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Workspace tour"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </header>

      {statusMsg && !isDocumentProcessing ? (
        <div className="pointer-events-auto fixed right-4 top-5 z-[140] w-[min(92vw,380px)] animate-in slide-in-from-right-5 fade-in duration-300">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-sm flex items-start gap-3 ${
              statusType === "error"
                ? "border-red-200 bg-red-50/95"
                : "border-emerald-200 bg-white/95"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {statusType === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${
                  statusType === "error" ? "text-red-600" : "text-emerald-700"
                }`}
              >
                {statusType === "error" ? "Something went wrong" : "Done"}
              </p>
              <p className={`mt-0.5 text-xs break-words leading-relaxed ${statusType === "error" ? "text-red-700" : "text-slate-600"}`}>
                {statusMsg}
              </p>
            </div>
            <button
              onClick={() => setStatusMsg("")}
              className={`shrink-0 p-1 rounded-lg transition-colors ${
                statusType === "error"
                  ? "text-red-400 hover:text-red-600 hover:bg-red-100"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title="Dismiss"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
      <div className="absolute bottom-6 right-6 z-50 flex gap-2 lg:hidden">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95"
        >
          {showPreview ? (
            <Pencil className="w-6 h-6" />
          ) : (
            <Eye className="w-6 h-6" />
          )}
        </button>
      </div>

      <aside className={`${showPreview ? "hidden" : "flex"} absolute inset-0 z-20 w-full border-r border-slate-200 bg-white shadow-xl transition-[width] duration-200 ease-out lg:relative lg:flex lg:shadow-none ${isSidebarMinimized ? "lg:w-[68px]" : "lg:w-[460px]"}`}>
        <WorkspaceNavigation
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setIsSidebarMinimized(false);
          }}
          progress={workspaceProgress}
          isMinimized={isSidebarMinimized}
          onToggleMinimized={() => setIsSidebarMinimized((current) => !current)}
        />
        <div className={`min-w-0 flex-1 overflow-y-auto bg-slate-50/60 scrollbar-hide ${isSidebarMinimized ? "block lg:hidden" : "block"}`}>
            {activeSection === "files" && (
              <FilesPanel
                items={data.items}
                smartInput={smartInput}
                onSmartInputChange={setSmartInput}
                isAnalyzingText={isAnalyzingText}
                onSmartAnalysis={handleSmartAnalysis}
                isParsing={isParsing}
                parseProgress={parseProgress}
                isDocumentProcessing={isDocumentProcessing}
                onOpenUploadModal={() => setIsFileUploadOpen(true)}
                isDriveReady={canUseDrive}
                onOpenDriveModal={handleOpenDriveModal}
                onAddManualItem={handleManualAdd}
              />
            )}

            {activeSection === "sender" && (
              <SenderTab
                agencies={agencies}
                isLoadingAgencies={isLoadingAgencies}
                agencyLoadError={agencyLoadError}
                onRetryAgencies={() => void loadAgencies(true)}
                selectedAgencyId={selectedAgencyId}
                onSelectAgency={handleSelectAgency}
                onOpenAgencyModal={openAgencyModal}
                onDeleteAgency={handleDeleteAgency}
                sender={data.sender}
                onUpdateSender={(field, value) => updateField("sender", field, value)}
              />
            )}

            {activeSection === "recipient" && (
              <div className="p-6"><RecipientTab
                recipient={data.recipient}
                onUpdateField={updateField}
              /></div>
            )}

            {activeSection === "project" && (
              <div className="p-6">
                {suggestionsLoading ? <p className="mb-3 text-xs text-slate-500">Loading saved suggestions…</p> : null}
                {suggestionsError ? <button type="button" className="mb-3 text-xs font-semibold text-red-600" onClick={() => void loadSuggestions(true)}>Suggestions unavailable. Retry</button> : null}
                <ProjectTab
                project={data.project}
                onUpdateField={updateField}
                projectNameSuggestions={suggestions.projectNames}
                departmentSuggestions={suggestions.departments}
                transmittalValidation={transmittalNumberValidation}
                />
              </div>
            )}

            {activeSection === "delivery" && (
              <DeliveryPanel
                transmissionMethod={data.transmissionMethod}
                onUpdateTransmission={updateTransmission}
                notes={data.notes}
                onUpdateNotes={handleUpdateNotes}
              />
            )}

            {activeSection === "signoff" && (
              <div className="p-6">
                {suggestionsLoading ? <p className="mb-3 text-xs text-slate-500">Loading saved suggestions…</p> : null}
                {suggestionsError ? <button type="button" className="mb-3 text-xs font-semibold text-red-600" onClick={() => void loadSuggestions(true)}>Suggestions unavailable. Retry</button> : null}
                <SignatoriesTab
                signatories={data.signatories}
                onUpdateSignatory={handleUpdateSignatory}
                preparedBySuggestions={suggestions.preparedByNames}
                preparedByRoleSuggestions={suggestions.preparedByRoles}
                notedBySuggestions={suggestions.notedByNames}
                notedByRoleSuggestions={suggestions.notedByRoles}
                />
              </div>
            )}

            {activeSection === "review" && (
              <ReviewPanel
                data={data}
                onEdit={setActiveSection}
                onSave={handleSaveTransmittal}
                onExportPdf={handlePrint}
                onExportDocx={handleDownloadDocx}
                isSaving={isSaving}
                isGeneratingPdf={isGeneratingPdf}
                isGeneratingDocx={isGeneratingDocx}
              />
            )}
        </div>
      </aside>

      <PreviewPanel
        showPreview={showPreview}
        containerRef={previewContainerRef}
        zoomPercent={zoomPercent}
        previewScale={previewScale}
        data={data}
        hasFormData={hasFormData}
        isDocumentProcessing={isDocumentProcessing}
        isGeneratingPdf={isGeneratingPdf}
        columnWidths={columnWidths}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onResetColumnWidths={handleResetColumnWidths}
        onZoomSet={handleZoomSet}
        onUpdateItem={updateItem}
        onAdjustItemQty={adjustItemQty}
        onRemoveItem={removeItem}
        onMoveItem={moveItem}
        onReorderItems={handleReorderItems}
        onAddItem={handleManualAdd}
        onBulkAdd={() => setIsBulkModalOpen(true)}
        onUpdateSignatory={handleUpdateSignatory}
        onUpdateReceivedBy={handleUpdateReceivedBy}
        onUpdateFooter={handleUpdateFooter}
        onUpdateNotes={handleUpdateNotes}
        onDropFiles={(files) => {
          setFileUploadInitialFiles(files);
          setIsFileUploadOpen(true);
        }}
        onResizeDivider={handleResizeDivider}
      />
      </div>

      {/* ─── Modals ─── */}
      <FileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => {
          setIsFileUploadOpen(false);
          setFileUploadInitialFiles([]);
        }}
        onUploadFiles={handleUploadFiles}
        isDriveReady={canUseDrive}
        isParsing={isParsing}
        parseProgress={parseProgress}
        initialFiles={fileUploadInitialFiles}
      />
      <TransmittalListModal
        isOpen={isTransmittalListOpen}
        scope={transmittalListScope}
        onClose={() => setIsTransmittalListOpen(false)}
        onOpenTransmittal={handleOpenTransmittal}
        onCopyTransmittal={handleCopyTransmittal}
        onDeleteTransmittal={handleDeleteTransmittal}
        apiBaseUrl={apiBaseUrl}
      />
      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImportDriveLink={handleBulkImportDriveLink}
      />
      <DocxPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        html={docxPreviewHtml}
      />
      <DriveFileModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        files={driveFiles}
        searchValue={driveSearch}
        isLoading={isDriveLoading}
        error={driveError}
        selectedIds={driveSelected}
        isAllSelected={
          driveFiles.length > 0 &&
          driveFiles.every((file) => driveSelected[file.id])
        }
        onSearchChange={setDriveSearch}
        onSearch={handleDriveSearch}
        onToggle={handleDriveToggle}
        onToggleAll={handleDriveToggleAll}
        onAddSelected={handleDriveAddSelected}
        isImporting={isDriveSelectionImporting}
        processingMessage={statusMsg}
      />
      <ExportChoiceModal
        isOpen={exportChoiceOpen}
        format={pendingExportFormat}
        fileName={pendingExportFileName}
        isUploading={isUploadingToDrive}
        onDownloadLocal={handleExportLocalDownload}
        onUploadToDrive={handleExportUploadToDrive}
        onClose={handleCloseExportChoice}
      />
      <FolderPickerModal
        isOpen={exportFolderPickerOpen}
        onClose={handleCloseExportFolderPicker}
        onSelect={handleFolderSelected}
      />
      <AgencyPresetModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        mode={agencyModalMode}
        isDriveReady={canUseDrive}
        draft={agencyDraft}
        onChange={setAgencyDraft}
        onLogoUpload={handleAgencyLogoUpload}
        driveLogoLink={agencyDriveLogoLink}
        onDriveLogoLinkChange={setAgencyDriveLogoLink}
        onImportDriveLogo={handleAgencyDriveLogoImport}
        isImportingDriveLogo={isImportingAgencyDriveLogo}
        onSave={saveAgencyPreset}
      />

      <FloatingAccount
        user={{
          name: session?.user?.name,
          email: session?.user?.email,
          image: session?.user?.image,
        }}
        apiBaseUrl={apiBaseUrl}
        driveAvailability={driveAvailability}
        onSignOut={handleSignOut}
      />

      <OnboardingTour
        steps={TOUR_STEPS}
        isOpen={isTourOpen}
        currentStep={tourStep}
        onNext={nextTourStep}
        onBack={previousTourStep}
        onSkip={skipTour}
        onFinish={finishTour}
      />
      <AlertDialog open={isAiPromptOpen} onOpenChange={setIsAiPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Personal AI Key Detected</AlertDialogTitle>
            <AlertDialogDescription>
              We noticed that you don&apos;t have an AI API key yet. Can you
              paste your AI API key now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAiPromptNo}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiPromptYes}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .ease-out-expo { transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1); }
            `}</style>
    </div>
  );
};

export const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);
