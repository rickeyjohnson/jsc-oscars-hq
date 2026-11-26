import { describe, expect, it } from "vitest"
import { buildModel, totals } from "../statsLab"
import { leaderboard, totalsFor, type PastRow } from "../../../../supabase/functions/_shared/chat/statsMath"

const rows: PastRow[] = [
    { season_label: "Fall 23", season_order: 1, member_id: "a", noms: 6, wins: 2 },
    { season_label: "Fall 25", season_order: 3, member_id: "a", noms: 8, wins: 3 },
    { season_label: "Fall 25", season_order: 3, member_id: "b", noms: 12, wins: 3 },
    { season_label: "Fall 25", season_order: 3, member_id: "c", noms: 4, wins: 3 },
]
const members = [{ id: "a", name: "Ann" }, { id: "b", name: "Ben" }, { id: "c", name: "Cy" }]

describe("totalsFor", () => {
    it("agrees with the app's statsLab totals", () => {
        const model = buildModel({ rows, members })
        for (const m of members) {
            const mine = totalsFor(rows, m.id)
            const app = totals(model, m.id)
            expect([mine.wins, mine.noms, mine.seasons]).toEqual([app.wins, app.noms, app.sem])
            expect(mine.rate).toBe(app.rate)
            expect(mine.approx).toBe(app.approx)
        }
    })
})

describe("leaderboard", () => {
    it("ranks by wins with shared ranks for ties", () => {
        const b = leaderboard(rows, members, "wins")
        expect(b.map((r) => [r.name, r.rank, r.tied])).toEqual([["Ann", 1, false], ["Ben", 2, true], ["Cy", 2, true]])
    })
    it("a win-rate board leaves out members under 10 nominations", () => {
        expect(leaderboard(rows, members, "rate").map((r) => r.name)).toEqual(["Ann", "Ben"])
    })
})
