import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.fn()
vi.mock("../supabaseClient", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }))
import { fetchMemberNameStatus } from "./members"

beforeEach(() => rpc.mockReset())

describe("fetchMemberNameStatus", () => {
    it("returns the rpc rows", async () => {
        rpc.mockResolvedValueOnce({ data: [{ name: "Ann", taken: true }], error: null })
        expect(await fetchMemberNameStatus()).toEqual([{ name: "Ann", taken: true }])
        expect(rpc).toHaveBeenCalledWith("member_name_status")
    })
    it("falls back to available names (all untaken) when the rpc is missing", async () => {
        rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "nope" } }).mockResolvedValueOnce({ data: ["Cy", "Ann"], error: null })
        expect(await fetchMemberNameStatus()).toEqual([{ name: "Cy", taken: false }, { name: "Ann", taken: false }])
        expect(rpc).toHaveBeenLastCalledWith("available_member_names")
    })
    it("falls back on any error, and throws only if the fallback fails too", async () => {
        rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } }).mockResolvedValueOnce({ data: null, error: { message: "dead" } })
        await expect(fetchMemberNameStatus()).rejects.toBeTruthy()
    })
})
