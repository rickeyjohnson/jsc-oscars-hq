import { beforeEach, describe, expect, it, vi } from "vitest"

const sb = vi.hoisted(() => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    return {
        upsert,
        getUser: vi.fn(),
        getSession: vi.fn(),
        client: {
            auth: { getUser: vi.fn(), getSession: vi.fn() },
            from: vi.fn(() => ({ upsert })),
        },
    }
})
vi.mock("../supabaseClient", () => ({ supabase: sb.client }))
import { castVote } from "./votes"

beforeEach(() => {
    sb.upsert.mockClear()
    sb.client.auth.getUser.mockReset().mockRejectedValue(new Error("network call"))
    sb.client.auth.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null })
})

describe("votes api", () => {
    it("takes the user id from the local session, never a network getUser (P1-2)", async () => {
        await castVote("B", "C", "N")
        expect(sb.client.auth.getUser).not.toHaveBeenCalled()
        expect(sb.upsert).toHaveBeenCalledWith({ ballot_id: "B", category_id: "C", nominee_id: "N", voter_id: "u1" }, { onConflict: "ballot_id,category_id,voter_id" })
    })
    it("no session reads as signed out", async () => {
        sb.client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
        await expect(castVote("B", "C", "N")).rejects.toThrow("Not signed in")
    })
    it("a hung request fails with a timeout instead of spinning forever", async () => {
        vi.useFakeTimers()
        sb.upsert.mockReturnValueOnce(new Promise(() => {}))
        const p = castVote("B", "C", "N")
        const assertion = expect(p).rejects.toThrow(/timed out/i)
        await vi.advanceTimersByTimeAsync(20_000)
        await assertion
        vi.useRealTimers()
    })
})
