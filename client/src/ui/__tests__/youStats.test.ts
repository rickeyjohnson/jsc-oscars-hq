import { describe, expect, it } from "vitest"
import { youStats } from "../logic/youStats"
import type { BallotSummary } from "../../lib/voting"

const b = (id: string, cats: number, voted: number): BallotSummary =>
    ({ id, season_id: "S", parent_ballot_id: null, name: id, round: "main", status: "open", opens_at: "", closes_at: "", category_count: cats, my_vote_count: voted }) as BallotSummary
const now = new Date("2026-11-20T12:00:00Z")
const ceremony = new Date("2026-12-03T12:30:00Z")

describe("youStats", () => {
    it("before release", () => {
        const s = youStats({ released: false, summaries: [b("a", 20, 20), b("b", 21, 21), b("c", 10, 0)], tally: null, ceremonyAt: ceremony, now })
        expect(s.map((x) => [x.label, x.value])).toEqual([["Ballots voted", "2 of 3"], ["Categories voted", "41"], ["Days to Oscars", "13"]])
        expect(new Set(s.map((x) => x.pebble)).size).toBe(3)
    })
    it("omits the days tile without a future date", () => {
        expect(youStats({ released: false, summaries: [], tally: null, ceremonyAt: null, now })).toHaveLength(2)
        expect(youStats({ released: false, summaries: [], tally: null, ceremonyAt: new Date("2026-01-01"), now })).toHaveLength(2)
    })
    it("after release", () => {
        const s = youStats({ released: true, summaries: [], tally: { wins: 3, noms: 7 }, ceremonyAt: null, now })
        expect(s.map((x) => [x.label, x.value])).toEqual([["Wins", "3"], ["Nominations", "7"], ["Win rate", "43%"]])
        expect(youStats({ released: true, summaries: [], tally: null, ceremonyAt: null, now })[2].value).toBe("0%")
    })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("ProfilePage source", () => {
    const src = readFileSync(join(__dirname, "../../pages/ProfilePage.tsx"), "utf8")
    it("has no placeholder data and keeps Log out", () => {
        expect(src).not.toMatch(/username@example\.com|"--"/)
        expect(src).toContain("Log out")
    })
})
