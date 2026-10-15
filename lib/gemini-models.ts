/**
 * Shared Gemini model catalog.
 *
 * Lives in `lib/` so both the server (API routes, parsing service) and the
 * client (AI settings UI) resolve the same model ids and defaults.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export type GeminiModelOption = {
  id: string;
  label: string;
  description: string;
};

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast and balanced — the recommended default.",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Highest quality for complex or long documents.",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    description: "Lowest cost, best for simple document lists.",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    description: "Previous generation, fast and inexpensive.",
  },
  {
    id: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    description: "Previous generation, lowest cost.",
  },
];

/**
 * Accepts a model id shaped like a Gemini model name. Permissive on purpose so
 * newer models can be used without a code change, but still rejects junk.
 */
const GEMINI_MODEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/;

export const isSupportedGeminiModelId = (value: string): boolean =>
  GEMINI_MODEL_OPTIONS.some((option) => option.id === value);

export const normalizeGeminiModel = (value?: string | null): string | null => {
  const trimmed = String(value ?? "").trim();
  return GEMINI_MODEL_PATTERN.test(trimmed) ? trimmed : null;
};

export const getGeminiModelLabel = (value: string): string =>
  GEMINI_MODEL_OPTIONS.find((option) => option.id === value)?.label ?? value;
