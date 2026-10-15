import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ list: vi.fn(), createClient: vi.fn() }))

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options: unknown) {
      mocks.createClient(options)
    }
    models = { list: mocks.list }
  },
}))

import { listAvailableGeminiModels } from "./gemini-models"

const model = (
  name: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  name,
  supportedActions: ["generateContent"],
  ...overrides,
})

// Minimal stand-in for the SDK Pager: exposes `page`, `hasNextPage`, `nextPage`.
const pager = (pages: Array<Array<Record<string, unknown>>>) => {
  let index = 0
  return {
    get page() {
      return pages[index] ?? []
    },
    hasNextPage: () => index < pages.length - 1,
    nextPage: async () => {
      index += 1
      return pages[index] ?? []
    },
  }
}

describe("listAvailableGeminiModels", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps usable Gemini models, drops other families, and sorts newest first", async () => {
    mocks.list.mockResolvedValue(
      pager([
        [
          model("models/gemini-2.0-flash"),
          model("models/gemini-2.5-flash", { displayName: "Gemini 2.5 Flash" }),
          model("models/gemini-2.5-flash-image"),
          model("models/gemini-embedding-001", { supportedActions: ["embedContent"] }),
          model("models/gemma-3-27b-it"),
          model("models/gemini-2.5-pro"),
        ],
      ]),
    )

    const models = await listAvailableGeminiModels("test-key")

    expect(models.map((entry) => entry.id)).toEqual([
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ])
    expect(models[0].label).toBe("Gemini 2.5 Flash")
  })

  it("walks multiple pages and de-duplicates repeated ids", async () => {
    mocks.list.mockResolvedValue(
      pager([
        [model("models/gemini-2.0-flash")],
        [model("models/gemini-2.0-flash"), model("models/gemini-2.5-flash")],
      ]),
    )

    const models = await listAvailableGeminiModels("test-key")

    expect(models.map((entry) => entry.id)).toEqual([
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ])
  })

  it("is permissive when the API omits supportedActions", async () => {
    mocks.list.mockResolvedValue(pager([[{ name: "models/gemini-2.5-flash" }]]))

    const models = await listAvailableGeminiModels("test-key")

    expect(models).toHaveLength(1)
    expect(models[0].id).toBe("gemini-2.5-flash")
  })

  it("bounds the client request timeout and page size", async () => {
    mocks.list.mockResolvedValue(pager([[model("models/gemini-2.5-flash")]]))

    await listAvailableGeminiModels("my-key")

    expect(mocks.createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "my-key",
        httpOptions: { timeout: 15_000 },
      }),
    )
    expect(mocks.list).toHaveBeenCalledWith({ config: { pageSize: 100 } })
  })
})
