import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ existing: [] as { round: string }[], insertError: null as null | { code: string; message: string } }))
vi.mock("../supabaseClient", () => ({
    supabase: {
        from: () => ({
            select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: state.existing, error: null }) }) }),
            insert: () => ({ select: () => ({ single: () => Promise.resolve(state.insertError ? { data: null, error: state.insertError } : { data: { id: "R1" }, error: null }) }) }),
        }),
    },
}))
import { createRoundBallot, RoundExistsError } from "./ballots"
import type { Ballot } from "../types"

const main: Ballot = { id: "M", season_id: "S", parent_ballot_id: null, name: "Main", round: "main", status: "closed", opens_at: "2026-11-01T00:00:00Z", closes_at: "2026-11-02T00:00:00Z" }
const entries = [{ category_id: "c1", nominee_ids: ["a", "b"] }]
const future = new Date(Date.now() + 86_400_000).toISOString()

beforeEach(() => {
    state.existing = []
    state.insertError = null
})

describe("createRoundBallot race (P1-12)", () => {
    it("refuses when the round already exists", async () => {
        state.existing = [{ round: "tiebreak" }]
        await expect(createRoundBallot(main, "tiebreak", entries, future)).rejects.toBeInstanceOf(RoundExistsError)
    })
    it("a unique violation from a simultaneous start reads as 'Someone already started it.'", async () => {
        state.insertError = { code: "23505", message: "duplicate key value violates unique constraint" }
        await expect(createRoundBallot(main, "tiebreak", entries, future)).rejects.toMatchObject({ message: "Someone already started it." })
    })
})
