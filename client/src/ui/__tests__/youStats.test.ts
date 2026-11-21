import { describe, expect, it } from "vitest"
import { youStats } from "../logic/youStats"
import type { BallotSummary } from "../../lib/voting"

const b = (id: string, cats: number, voted: number): BallotSummary =>
    ({ id, season_id: "S", parent_ballot_id: null, name: id, round: "main", status: "open", opens_at: "", closes_at: "", category_count: cats, my_vote_count: voted }) as BallotSummary
const now = new Date("2026-11-20T12:00:00Z")
const ceremony = new Date("2026-12-03T12:30:00Z")

describe("youStats", () => {
    it("before release: wins and win rate are locked, Noms shows, plain stats stay", () => {
        const s = youStats({ released: false, summaries: [b("a", 20, 20), b("b", 21, 21), b("c", 10, 0)], tally: null, noms: 4, ceremonyAt: ceremony, now })
        expect(s.tiles.map((x) => [x.label, x.value, Boolean(x.locked)])).toEqual([["Wins", "After the reveal", true], ["Noms", "4", false], ["Win rate", "After the reveal", true]])
        expect(s.tiles.every((x) => x.pebble === null)).toBe(true)
        expect(s.plain.map((x) => [x.label, x.value])).toEqual([["Ballots voted", "2 of 3"], ["Categories voted", "41"], ["Days to Oscars", "13"]])
        expect(s.plain.every((x) => x.pebble === null)).toBe(true)
    })
    it("never exposes a win count before release", () => {
        const s = youStats({ released: false, summaries: [], tally: { wins: 9, noms: 9 }, noms: 2, ceremonyAt: null, now })
        expect(JSON.stringify(s)).not.toContain("9")
    })
    it("omits the days tile without a future date", () => {
        expect(youStats({ released: false, summaries: [], tally: null, noms: 0, ceremonyAt: null, now }).plain).toHaveLength(2)
        expect(youStats({ released: false, summaries: [], tally: null, noms: 0, ceremonyAt: new Date("2026-01-01"), now }).plain).toHaveLength(2)
    })
    it("after release: wins, noms and win rate", () => {
        const s = youStats({ released: true, summaries: [], tally: { wins: 3, noms: 7 }, noms: null, ceremonyAt: null, now })
        expect(s.tiles.map((x) => [x.label, x.value])).toEqual([["Wins", "3"], ["Noms", "7"], ["Win rate", "43%"]])
        expect(youStats({ released: true, summaries: [], tally: null, noms: null, ceremonyAt: null, now }).tiles[2].value).toBe("0%")
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
