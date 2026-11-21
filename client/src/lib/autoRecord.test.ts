import { describe, expect, it } from "vitest"
import { planAutoRecord } from "./autoRecord"
import { buildCategoryViews } from "./tallyView"
import type { Category, ResultRow } from "../types"

const cat = (id: string, noms: string[]): Category => ({ id, name: id, description: "", order: 1, nominee_mode: "everyone", allow_member_add: false, nominees: noms.map((n) => ({ id: n, display_name: n, type: "person", member_ids: [] })) })
const v = (category_id: string, nominee_id: string, voter_id: string) => ({ category_id, nominee_id, voter_id, updated_at: "" })
const views = (round: "main" | "tiebreak", cats: Category[], votes: ReturnType<typeof v>[], results: Record<string, ResultRow> = {}) =>
    buildCategoryViews({ round, categories: cats, mainCategories: cats, votes, results, committeeMemberIds: [] })

describe("planAutoRecord", () => {
    const cats = [cat("c1", ["a", "b"]), cat("c2", ["x", "y"])]
    const votes = [v("c1", "a", "u1"), v("c1", "a", "u2"), v("c2", "x", "u1"), v("c2", "y", "u2")]

    it("main: inserts every unrecorded category (a tie is recorded with no winner)", () => {
        const w = planAutoRecord("main", "M", views("main", cats, votes), {}, new Set())
        expect(w.map((x) => [x.row.category_id, x.row.winner_nominee_id, x.expected])).toEqual([["c1", "a", null], ["c2", null, null]])
    })
    it("is idempotent: nothing to write once this ballot recorded them", () => {
        const first = planAutoRecord("main", "M", views("main", cats, votes), {}, new Set())
        const results = Object.fromEntries(first.map((w) => [w.row.category_id, w.row]))
        expect(planAutoRecord("main", "M", views("main", cats, votes, results), results, new Set())).toEqual([])
    })
    it("never changes a recorded winner on its own", () => {
        const results = { c1: { category_id: "c1", decided_ballot_id: "OTHER", winner_nominee_id: "b", nominee_ids: ["a", "b"], top3_nominee_ids: [], decided_by: "manual" } as ResultRow }
        const w = planAutoRecord("main", "M", views("main", cats, votes, results), results, new Set())
        expect(w.map((x) => x.row.category_id)).toEqual(["c2"])
    })
    it("a round updates the row only while the earlier ballot still owns it", () => {
        const results = { c2: { category_id: "c2", decided_ballot_id: "M", winner_nominee_id: null, nominee_ids: ["x", "y"], top3_nominee_ids: [], decided_by: null } as ResultRow }
        const t = [cat("c2", ["x", "y"])]
        const w = planAutoRecord("tiebreak", "T", views("tiebreak", t, [v("c2", "x", "u1"), v("c2", "x", "u2")], results), results, new Set())
        expect(w).toHaveLength(1)
        expect(w[0].expected).toBe("M")
        expect(w[0].row.winner_nominee_id).toBe("x")
        expect(w[0].row.decided_by).toBe("tiebreak")
    })
    it("a committee round never records by counting", () => {
        expect(planAutoRecord("committee", "C", [], {}, new Set())).toEqual([])
    })
})
