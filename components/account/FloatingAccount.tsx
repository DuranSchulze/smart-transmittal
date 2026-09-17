import React, { useEffect, useState } from "react";


interface FloatingAccountProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  apiBaseUrl: string;
  driveAvailability: "unknown" | "ready" | "unavailable";
  onSignOut: () => void;
}

export const FloatingAccount: React.FC<FloatingAccountProps> = ({
  user,
  apiBaseUrl,
  driveAvailability,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasCustomGeminiKey, setHasCustomGeminiKey] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState(false);
  const [isSavingAiKey, setIsSavingAiKey] = useState(false);
  const [isDeletingAiKey, setIsDeletingAiKey] = useState(false);

  const loadAiSettings = async () => {
    if (!apiBaseUrl) return;
    setIsLoadingAiSettings(true);
    setAiStatus("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-ai-settings`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load AI settings.");
      }
      setHasCustomGeminiKey(Boolean(payload?.hasCustomGeminiKey));
    } catch (error: any) {
      setAiStatus(error?.message || "Failed to load AI settings.");
    } finally {
      setIsLoadingAiSettings(false);
    }
  };

  const openAiSettings = () => {
    setGeminiApiKey("");
    setShowApiKey(false);
    setIsAiSettingsOpen(true);
    void loadAiSettings();
  };

  useEffect(() => {
    const handleOpenAiSettings = () => {
      openAiSettings();
    };

    window.addEventListener("open-ai-settings", handleOpenAiSettings);
    return () => {
      window.removeEventListener("open-ai-settings", handleOpenAiSettings);
    };
  }, []);

  const saveAiKey = async () => {
    const key = geminiApiKey.trim();
    if (!key) {
      setAiStatus("Please enter a Gemini API key.");
      return;
    }
    setIsSavingAiKey(true);
    setAiStatus("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-ai-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ geminiApiKey: key }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save AI key.");
      }
      setHasCustomGeminiKey(Boolean(payload?.hasCustomGeminiKey));
      setGeminiApiKey("");
      setAiStatus(
        payload?.warning
          ? `Saved with warning: ${payload.warning}`
          : "Gemini API key saved.",
      );
    } catch (error: any) {
      setAiStatus(error?.message || "Failed to save AI key.");
    } finally {
      setIsSavingAiKey(false);
    }
  };

  const removeAiKey = async () => {
    setIsDeletingAiKey(true);
    setAiStatus("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/user-ai-settings`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to remove AI key.");
      }
      setHasCustomGeminiKey(false);
      setGeminiApiKey("");
      setAiStatus("Personal Gemini API key removed. Using system key.");
    } catch (error: any) {
      setAiStatus(error?.message || "Failed to remove AI key.");
    } finally {
      setIsDeletingAiKey(false);
    }
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/30 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Close account modal"
          />
          <div className="relative z-50 w-[340px] overflow-hidden rounded-2xl border border-divider bg-white shadow-feature animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-wash p-6">
              <div className="flex items-center gap-4">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-16 h-16 rounded-full ring-2 ring-royal/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-royal flex items-center justify-center text-white font-semibold text-xl">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-ink font-semibold truncate text-lg">
                    {user.name || "User"}
                  </p>
                  <p className="text-helper text-xs truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${driveAvailability === "ready" ? "bg-mint" : driveAvailability === "unavailable" ? "bg-amber-500" : "bg-helper"}`}
                />
                <span className="text-caption">
                  {driveAvailability === "ready"
                    ? "Google Drive Connected"
                    : driveAvailability === "unavailable"
                      ? "Drive Not Connected"
                      : "Drive checks when first used"}
                </span>
              </div>

              <div className="pt-2 border-t border-divider">
                <p className="text-xs font-medium text-helper mb-2">
                  Stored in Cloud
                </p>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-helper"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                  <span className="text-xs text-helper">
                    PostgreSQL Database
                  </span>
                </div>
              </div>

              <button
                onClick={openAiSettings}
                className="w-full rounded-full bg-fog px-4 py-2.5 text-xs font-medium text-caption transition-all hover:bg-wash hover:text-royal"
              >
                AI Key Settings
              </button>

              <button
                onClick={onSignOut}
                className="w-full rounded-full bg-fog px-4 py-2.5 text-xs font-medium text-caption transition-all hover:bg-coral/10 hover:text-coral"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {isAiSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setIsAiSettingsOpen(false)}
            aria-label="Close AI settings modal"
          />
          <div className="relative z-[70] w-full max-w-md overflow-hidden rounded-2xl border border-divider bg-white shadow-feature">
            <div className="p-6 border-b border-divider">
              <h3 className="text-sm font-semibold text-ink">
                Gemini API Key
              </h3>
              <p className="mt-1 text-xs text-helper">
                Optional. If set, your personal key is preferred over the system
                key during AI parsing.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-caption">
                Current source:{" "}
                <span className="font-medium text-ink">
                  {isLoadingAiSettings
                    ? "Loading..."
                    : hasCustomGeminiKey
                      ? "Personal key"
                      : "System key"}
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="gemini-api-key"
                  className="text-xs font-medium text-caption"
                >
                  New / Replace Key
                </label>
                <input
                  id="gemini-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Paste Gemini API key"
                  className="w-full rounded-lg border border-divider bg-white px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="text-xs font-medium text-helper hover:text-royal"
                >
                  {showApiKey ? "Hide Key" : "Show Key"}
                </button>
              </div>

              {aiStatus ? (
                <p className="rounded-lg bg-fog px-3 py-2 text-xs text-caption break-words">
                  {aiStatus}
                </p>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={saveAiKey}
                  disabled={
                    isSavingAiKey || isDeletingAiKey || isLoadingAiSettings
                  }
                  className="col-span-2 rounded-full bg-royal py-2 text-xs font-medium text-white hover:bg-royal/90 disabled:opacity-50"
                >
                  {isSavingAiKey ? "Saving..." : "Save / Test Key"}
                </button>
                <button
                  onClick={removeAiKey}
                  disabled={
                    isDeletingAiKey ||
                    isSavingAiKey ||
                    isLoadingAiSettings ||
                    !hasCustomGeminiKey
                  }
                  className="rounded-full bg-fog py-2 text-xs font-medium text-caption hover:bg-coral/10 hover:text-coral disabled:opacity-50"
                >
                  {isDeletingAiKey ? "..." : "Remove"}
                </button>
              </div>

              <button
                onClick={() => setIsAiSettingsOpen(false)}
                className="w-full rounded-full bg-fog py-2 text-xs font-medium text-caption hover:bg-wash hover:text-royal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-tour="floating-account" className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-royal shadow-card flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-full h-full rounded-full border-2 border-white"
            />
          ) : (
            <span className="text-white font-medium">{initials}</span>
          )}
        </button>
      </div>
    </>
  );
};
