import { useState } from "react"
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock("../services/agency-api", () => ({ listAgencies: mocks.list, createAgency: mocks.create, updateAgency: mocks.update, deleteAgency: mocks.remove }))
import { useAgencyManager } from "./useAgencyManager"
import { createInitialTransmittalData } from "./useTransmittalDraft"
const agency = { id: "shared", name: "Shared Agency", canManage: false, logoBase64: "data:image/png;base64,aGVsbG8=", addressLine1: "New address" }
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue([agency]) })
const useFixture = () => {
  const initial = createInitialTransmittalData()
  initial.agencyId = "shared"
  initial.sender.agencyName = "Saved snapshot"
  const [data, setData] = useState(initial)
  const manager = useAgencyManager({ data, setData, markDirty: vi.fn(), userId: "user-2", apiBaseUrl: "http://localhost", isDriveReady: false, onStatus: vi.fn() })
  return { data, manager }
}
it("preserves a saved sender snapshot when the agency list loads or refreshes", async () => {
  const { result } = renderHook(useFixture)
  await act(async () => { await result.current.manager.loadAgencies(true) })
  expect(result.current.data.sender.agencyName).toBe("Saved snapshot")
  expect(result.current.manager.agencies).toHaveLength(1)
})
it("lets another user explicitly apply shared company details and logo", async () => {
  const { result } = renderHook(useFixture)
  await act(async () => { await result.current.manager.loadAgencies(true) })
  act(() => result.current.manager.selectAgency("shared"))
  expect(result.current.data.sender).toMatchObject({ agencyName: "Shared Agency", logoBase64: agency.logoBase64, addressLine1: "New address" })
  expect(result.current.manager.canManageSelectedAgency).toBe(false)
  act(() => result.current.manager.openModal("update"))
  expect(result.current.manager.isAgencyModalOpen).toBe(false)
})
it("uses the stored URL rather than inline bytes when selecting a migrated agency", async () => {
  const logoUrl = "https://ik.imagekit.io/account/agency-logos/logo.png"
  mocks.list.mockResolvedValue([{ ...agency, logoUrl }])
  const { result } = renderHook(useFixture)
  await act(async () => { await result.current.manager.loadAgencies(true) })
  act(() => result.current.manager.selectAgency("shared"))
  expect(result.current.data.sender.logoUrl).toBe(logoUrl)
  expect(result.current.data.sender.logoBase64).toBeNull()
})
it("edits the agency opened from its card without replacing the selected sender", async () => {
  const owned = { ...agency, id: "owned", name: "My Agency", canManage: true }
  mocks.list.mockResolvedValue([agency, owned])
  mocks.update.mockResolvedValue({ ...owned, name: "Updated Agency" })
  const { result } = renderHook(useFixture)
  await act(async () => { await result.current.manager.loadAgencies(true) })
  act(() => result.current.manager.openModal("update", "owned"))
  expect(result.current.manager.agencyDraft.agencyName).toBe("My Agency")
  await act(async () => { await result.current.manager.save() })
  expect(mocks.update).toHaveBeenCalledWith("owned", expect.any(Object), "http://localhost")
  expect(result.current.data.agencyId).toBe("shared")
  expect(result.current.data.sender.agencyName).toBe("Saved snapshot")
})

afterEach(() => vi.restoreAllMocks())
it("deletes another user's shared agency and preserves the sender snapshot", async () => {
 vi.spyOn(window, "confirm").mockReturnValue(true)
 mocks.remove.mockResolvedValue({ ok: true })
 const { result } = renderHook(useFixture)
 await act(async () => { await result.current.manager.loadAgencies(true) })
 await act(async () => { await result.current.manager.remove("shared") })
 expect(mocks.remove).toHaveBeenCalledWith("shared", "http://localhost")
 expect(result.current.manager.agencies).toHaveLength(0)
 expect(result.current.data.agencyId).toBeNull()
 expect(result.current.data.sender.agencyName).toBe("Saved snapshot")
})
it("keeps the agency when deletion confirmation is cancelled", async () => {
 vi.spyOn(window, "confirm").mockReturnValue(false)
 const { result } = renderHook(useFixture)
 await act(async () => { await result.current.manager.loadAgencies(true) })
 await act(async () => { await result.current.manager.remove("shared") })
 expect(mocks.remove).not.toHaveBeenCalled()
 expect(result.current.manager.agencies).toHaveLength(1)
})
