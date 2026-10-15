import React from "react"
import { fireEvent, render, screen, cleanup } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { SenderTab } from "./SenderTab"
import { createInitialTransmittalData } from "@/hooks/useTransmittalDraft"
import type { AgencyRecord } from "@/services/agency-api"
afterEach(cleanup)
const agency: AgencyRecord = { id: "a", name: "Sample Agency", canManage: true, addressLine1: "Main Street", addressLine2: null, website: null, email: null, telephoneNumber: null, contactNumber: null, logoBase64: null, updatedAt: "2026-10-15" }
function setup(canManage = true) {
 const select = vi.fn(), open = vi.fn(), remove = vi.fn()
 render(<SenderTab agencies={[{ ...agency, canManage }]} isLoadingAgencies={false} agencyLoadError={null} onRetryAgencies={vi.fn()} selectedAgencyId="" onSelectAgency={select} onOpenAgencyModal={open} onDeleteAgency={remove} canManageSelectedAgency={false} sender={createInitialTransmittalData().sender} onUpdateSender={vi.fn()} />)
 return { select, open, remove }
}
it("opens details before applying an agency and provides a creator edit action", () => {
 const { select, open } = setup()
 fireEvent.click(screen.getByRole("button", { name: "Open Sample Agency" }))
 expect(screen.getByRole("dialog")).toBeTruthy()
 expect(screen.getByText("Main Street")).toBeTruthy()
 expect(select).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole("button", { name: "Edit agency" }))
 expect(open).toHaveBeenCalledWith("update", "a")
})
it("allows shared agency selection while keeping editing creator-only", () => {
 const { select } = setup(false)
 fireEvent.click(screen.getByRole("button", { name: "Open Sample Agency" }))
 expect(screen.queryByRole("button", { name: "Edit agency" })).toBeNull()
 fireEvent.click(screen.getByRole("button", { name: "Use this agency" }))
 expect(select).toHaveBeenCalledWith("a")
})

it("deletes from the library without opening or applying the agency", () => {
 const { select, open, remove } = setup()
 fireEvent.click(screen.getByRole("button", { name: "Delete Sample Agency" }))
 expect(remove).toHaveBeenCalledWith("a")
 expect(select).not.toHaveBeenCalled()
 expect(open).not.toHaveBeenCalled()
 expect(screen.queryByRole("dialog")).toBeNull()
})
it("allows library deletion for agencies created by another user", () => {
 const { remove } = setup(false)
 fireEvent.click(screen.getByRole("button", { name: "Delete Sample Agency" }))
 expect(remove).toHaveBeenCalledWith("a")
})

it("opens the correct agency editor directly from its card", () => {
 const { open, select } = setup()
 fireEvent.click(screen.getByRole("button", { name: "Edit Sample Agency" }))
 expect(open).toHaveBeenCalledWith("update", "a")
 expect(select).not.toHaveBeenCalled()
 expect(screen.queryByRole("dialog")).toBeNull()
})
it("keeps direct editing limited to the creator", () => {
 setup(false)
 expect(screen.queryByRole("button", { name: "Edit Sample Agency" })).toBeNull()
})
