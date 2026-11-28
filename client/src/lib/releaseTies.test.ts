import { describe, expect, it } from "vitest"
import { releaseChecks } from "./release"
import { buildResultCards } from "./resultsView"
import type { Ballot, Category, ResultRow } from "../types"

const ballot = { id: "B", round: "main", status: "closed", opens_at: "2026-12-01T00:00:00Z", closes_at: "2026-12-02T00:00:00Z" } as Ballot
const tie: ResultRow = {
    category_id: "c2",
    decided_ballot_id: "B",
    winner_nominee_id: null,
    nominee_ids: ["a", "b"],
    top3_nominee_ids: ["a", "b"],
    decided_by: null,
    places: [
        { nominee_id: "a", slot: 1, place: 1, tied: true },
        { nominee_id: "b", slot: 2, place: 1, tied: true },
    ],
}
const won: ResultRow = { category_id: "c1", decided_ballot_id: "B", winner_nominee_id: "x", nominee_ids: ["x"], top3_nominee_ids: ["x"], decided_by: "votes", places: null }
const status = { ballots: [ballot], mainCategoryIds: ["c1", "c2"], results: { c1: won, c2: tie } }

describe("revealing with ties", () => {
    it("blocks a tie by default and allows it when chosen", () => {
        const strict = releaseChecks(status, new Date("2026-12-05T00:00:00Z"))
        expect(strict.ready).toBe(false)
        expect(strict.ties).toBe(1)
        expect(releaseChecks(status, new Date("2026-12-05T00:00:00Z"), true).ready).toBe(true)
    })
    it("still blocks a category with no recorded result", () => {
        const s = { ...status, results: { c1: won } }
        expect(releaseChecks(s, new Date("2026-12-05T00:00:00Z"), true).ready).toBe(false)
    })
    it("shows a tie as tied for 1st, not pending", () => {
        const cat = { id: "c2", name: "Best Hair", description: "", order: 1, nominee_mode: "preset", allow_member_add: false, nominees: [{ id: "a", display_name: "A", type: "noun", member_ids: [] }, { id: "b", display_name: "B", type: "noun", member_ids: [] }] } as unknown as Category
        const [card] = buildResultCards([cat], { c2: tie })
        expect(card.pending).toBe(false)
        expect(card.podium.map((p) => p.tieLabel)).toEqual(["tied 1st", "tied 1st"])
        expect(card.note).toBe("Ended in a tie")
    })
})
