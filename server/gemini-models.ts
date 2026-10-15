import { GoogleGenAI, type Model } from "@google/genai";
import { normalizeGeminiModel } from "@/lib/gemini-models";

/**
 * Lists the Gemini models a given API key can actually use, straight from the
 * Gemini API (`ai.models.list()` → `GET /v1beta/models`).
 */

const PAGE_SIZE = 100;
const MAX_MODELS = 200;
const MAX_PAGES = 10;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Families surfaced by the models endpoint that accept `generateContent` but are
 * not usable for document→JSON extraction (embeddings, audio, image, etc.).
 */
const NON_GENERATIVE = /(^|[-_])(embedding|embed|aqa|tts|image|imagen|veo|learnlm)([-_]|$)/i;

export type AvailableGeminiModel = {
  id: string;
  label: string;
  description: string;
};

const toModelId = (name?: string): string =>
  String(name || "").replace(/^models\//, "").trim();

const supportsGenerateContent = (model: Model): boolean => {
  const actions = model.supportedActions;
  // Be permissive when the API omits the field; only exclude known mismatches.
  if (!actions || actions.length === 0) return true;
  return actions.some((action) => /generateContent/i.test(action));
};

const modelVersion = (id: string): number => {
  const match = id.match(/gemini-(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
};

const newestFirst = (a: string, b: string): number => {
  const versionDiff = modelVersion(b) - modelVersion(a);
  return versionDiff !== 0 ? versionDiff : a.localeCompare(b);
};

export const listAvailableGeminiModels = async (
  apiKey: string,
): Promise<AvailableGeminiModel[]> => {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  });

  const pager = await ai.models.list({ config: { pageSize: PAGE_SIZE } });

  const seen = new Set<string>();
  const models: AvailableGeminiModel[] = [];

  const ingest = (items: Model[] = []) => {
    for (const model of items) {
      const id = toModelId(model.name);
      if (!id || seen.has(id)) continue;
      if (!id.startsWith("gemini-")) continue;
      if (NON_GENERATIVE.test(id)) continue;
      if (!supportsGenerateContent(model)) continue;
      if (!normalizeGeminiModel(id)) continue;

      seen.add(id);
      models.push({
        id,
        label: model.displayName?.trim() || id,
        description: model.description?.trim() || "",
      });
    }
  };

  ingest(pager.page);

  let pagesFetched = 1;
  while (pager.hasNextPage() && models.length < MAX_MODELS && pagesFetched < MAX_PAGES) {
    ingest(await pager.nextPage());
    pagesFetched += 1;
  }

  return models.sort((a, b) => newestFirst(a.id, b.id)).slice(0, MAX_MODELS);
};
