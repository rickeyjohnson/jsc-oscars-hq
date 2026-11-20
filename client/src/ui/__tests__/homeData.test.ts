import { describe, expect, it, vi } from "vitest"
import { loadHomeData, type HomeIO } from "../logic/homeData"
import type { Season } from "../../types"
import type { BallotSummary } from "../../lib/voting"

const now = new Date("2026-12-01T12:00:00Z")
const season = (released: boolean): Season => ({ id: "s", name: "2026", ceremony_at: null, location: null, results_released_at: released ? "2026-12-01T00:00:00Z" : null })
const main: BallotSummary = { id: "b1", season_id: "s", parent_ballot_id: null, name: "Main", round: "main", status: "open", opens_at: "2026-11-01T00:00:00Z", closes_at: "2026-12-05T00:00:00Z", category_count: 2, my_vote_count: 0 }
const mk = (released: boolean): HomeIO => ({
    fetchCurrentSeason: vi.fn(async () => season(released)),
    fetchBallotSummaries: vi.fn(async () => [main]),
    fetchSeasonResults: vi.fn(async () => ({ categories: [], results: {} })),
    fetchReleaseStatus: vi.fn(async () => ({ season: season(released), ballots: [main], mainCategoryIds: [], results: {} })),
    fetchAllVotes: vi.fn(async () => [{ category_id: "c1", nominee_id: "n", voter_id: "u1", updated_at: "" }]),
    fetchMembers: vi.fn(async () => [{ id: "m1", name: "Ann", user_id: "u1" }, { id: "m2", name: "Bo", user_id: "u2" }] as never),
})

describe("loadHomeData fetch plan", () => {
    it("member before release: no results, no committee requests", async () => {
        const io = mk(false)
        const d = await loadHomeData(false, io, now)
        expect(io.fetchSeasonResults).not.toHaveBeenCalled()
        expect(io.fetchReleaseStatus).not.toHaveBeenCalled()
        expect(io.fetchAllVotes).not.toHaveBeenCalled()
        expect(io.fetchMembers).not.toHaveBeenCalled()
        expect(d.results).toBeNull()
        expect(d.checks).toBeNull()
    })
    it("member after release: results only", async () => {
        const io = mk(true)
        const d = await loadHomeData(false, io, now)
        expect(io.fetchSeasonResults).toHaveBeenCalledOnce()
        expect(io.fetchReleaseStatus).not.toHaveBeenCalled()
        expect(d.results).not.toBeNull()
    })
    it("committee before release: checks and completion, no results", async () => {
        const io = mk(false)
        const d = await loadHomeData(true, io, now)
        expect(io.fetchSeasonResults).not.toHaveBeenCalled()
        expect(d.checks).not.toBeNull()
        expect(d.completion?.members.map((m) => [m.name, m.voted])).toEqual([["Bo", 0], ["Ann", 1]])
    })
    it("no season: nothing else is fetched", async () => {
        const io = { ...mk(false), fetchCurrentSeason: vi.fn(async () => null) }
        const d = await loadHomeData(true, io, now)
        expect(io.fetchReleaseStatus).not.toHaveBeenCalled()
        expect(d.season).toBeNull()
    })
})
