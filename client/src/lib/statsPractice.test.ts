import { describe, expect, it } from "vitest"
import { nomineeStats, statsResults } from "./stats"
import type { Nominee, ResultRow } from "../types"

const row = (category_id: string, winner: string): ResultRow => ({ category_id, decided_ballot_id: "b", winner_nominee_id: winner, nominee_ids: [winner], top3_nominee_ids: [winner], decided_by: null })
const nominees: Record<string, Nominee> = { n1: { id: "n1", display_name: "A", type: "person", member_ids: ["m1"] }, n2: { id: "n2", display_name: "B", type: "person", member_ids: ["m2"] } }

describe("practice ballots in stats", () => {
    const results = [row("c1", "n1"), row("c2", "n2")]
    it("drops results of categories tagged in_stats false", () => {
        const kept = statsResults(results, [{ id: "c1" }, { id: "c2", in_stats: false }])
        expect(kept.map((r) => r.category_id)).toEqual(["c1"])
        expect(nomineeStats(kept, nominees).members).toEqual({ m1: { wins: 1, noms: 1 } })
    })
    it("keeps everything when nothing is practice (missing flag counts)", () => {
        expect(statsResults(results, [{ id: "c1" }, { id: "c2", in_stats: true }])).toBe(results)
    })
})
