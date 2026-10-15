import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ session: vi.fn(), findFirst: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: mocks.session } }, db: { agency: { findFirst: mocks.findFirst, update: mocks.update, delete: mocks.remove } } }))
import { PUT, DELETE } from "./route"
beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ user: { id: "user-2" } }); mocks.findFirst.mockResolvedValue(null) })
it("prevents another user from changing a shared agency", async () => {
  const response = await PUT(new NextRequest("http://localhost/api/agencies/shared", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agency: { name: "Changed" } }) }), { params: Promise.resolve({ id: "shared" }) })
  expect(response.status).toBe(404)
  expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "shared", userId: "user-2" } }))
  expect(mocks.update).not.toHaveBeenCalled()
})
it("allows a signed-in user to delete an agency created by another user", async () => {
  mocks.findFirst.mockResolvedValue({ id: "shared" })
  const response = await DELETE(new NextRequest("http://localhost/api/agencies/shared", { method: "DELETE" }), { params: Promise.resolve({ id: "shared" }) })
  expect(response.status).toBe(200)
  expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: "shared" }, select: { id: true } })
  expect(mocks.remove).toHaveBeenCalledWith({ where: { id: "shared" } })
})

it("rejects unauthenticated agency deletion", async () => {
 mocks.session.mockResolvedValue(null)
 const response = await DELETE(new NextRequest("http://localhost/api/agencies/shared", { method: "DELETE" }), { params: Promise.resolve({ id: "shared" }) })
 expect(response.status).toBe(401)
 expect(mocks.remove).not.toHaveBeenCalled()
})
it("returns not found when deleting an absent agency", async () => {
 const response = await DELETE(new NextRequest("http://localhost/api/agencies/missing", { method: "DELETE" }), { params: Promise.resolve({ id: "missing" }) })
 expect(response.status).toBe(404)
 expect(mocks.remove).not.toHaveBeenCalled()
})
