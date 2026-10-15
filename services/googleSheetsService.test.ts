import { afterEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock("./googleDriveService", () => ({ driveApiFetch: mocks.fetch, getGoogleAccessToken: vi.fn() }))
import { readSheetRows } from "./googleSheetsService"
afterEach(() => vi.resetAllMocks())
it("reads a renamed first worksheet through the shared Google client", async () => {
  mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ sheets: [{ properties: { title: "Client's Register" } }] })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ values: [["Description", "Qty"], ["Invoice", "1"]] })))
  expect(await readSheetRows("spreadsheet-id")).toEqual({ headers: ["Description", "Qty"], rows: [["Invoice", "1"]] })
  expect(decodeURIComponent(mocks.fetch.mock.calls[1][0])).toContain("/values/'Client''s Register'?majorDimension=ROWS")
})
