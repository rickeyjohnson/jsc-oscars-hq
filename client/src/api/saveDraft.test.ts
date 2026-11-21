import { beforeEach, describe, expect, it, vi } from "vitest"

const rpc = vi.hoisted(() => vi.fn())
vi.mock("../supabaseClient", () => ({ supabase: { rpc, from: vi.fn(() => { throw new Error("step-by-step path used") }) } }))
import { saveBallotDraft } from "./ballots"
import type { BallotFormData } from "../types"

const form: BallotFormData = {
    season_id: "S", name: " Fall ", opens_at: "2026-11-25T09:00", closes_at: "2026-11-29T21:00",
    categories: [{ id: "c", name: "Best Hair", description: "", order: 0, nominee_mode: "preset", allow_member_add: false, nominees: [{ id: "n", display_name: "A", type: "person", member_ids: [] }] }],
}

beforeEach(() => rpc.mockReset())

describe("saveBallotDraft", () => {
    it("saves everything in one rpc call when the function exists", async () => {
        rpc.mockResolvedValue({ data: "B1", error: null })
        expect(await saveBallotDraft(form, [], undefined)).toBe("B1")
        const [fn, args] = rpc.mock.calls[0]
        expect(fn).toBe("save_ballot_draft")
        expect(args.p_ballot.name).toBe("Fall")
        expect(args.p_categories[0].nominees).toEqual([{ display_name: "A", secondary_text: null, type: "person", member_ids: [] }])
    })
    it("a real database error is thrown, not hidden by the fallback", async () => {
        rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Only draft ballots can be rewritten" } })
        await expect(saveBallotDraft(form, [], "B1")).rejects.toMatchObject({ message: "Only draft ballots can be rewritten" })
    })
    it("a missing function falls back to the older step-by-step save", async () => {
        rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function" } })
        await expect(saveBallotDraft(form, [], undefined)).rejects.toThrow("step-by-step path used")
    })
})
