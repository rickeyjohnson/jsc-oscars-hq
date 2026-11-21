import { describe, expect, it } from "vitest"
import { youStats } from "../logic/youStats"

describe("youStats", () => {
    it("before release: wins and win rate are locked, Noms shows, and there are only these three", () => {
        const s = youStats({ released: false, tally: null, noms: 4 })
        expect(s.tiles.map((x) => [x.label, x.value, Boolean(x.locked)])).toEqual([["Wins", "After the reveal", true], ["Noms", "4", false], ["Win rate", "After the reveal", true]])
        expect(s.tiles.every((x) => x.pebble === null)).toBe(true)
        expect(Object.keys(s)).toEqual(["tiles"])
    })
    it("never exposes a win count before release", () => {
        expect(JSON.stringify(youStats({ released: false, tally: { wins: 9, noms: 9 }, noms: 2 }))).not.toContain("9")
    })
    it("after release: wins, noms and win rate", () => {
        const s = youStats({ released: true, tally: { wins: 3, noms: 7 }, noms: null })
        expect(s.tiles.map((x) => [x.label, x.value])).toEqual([["Wins", "3"], ["Noms", "7"], ["Win rate", "43%"]])
        expect(youStats({ released: true, tally: null, noms: null }).tiles[2].value).toBe("0%")
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
    it("with past stats the tiles are lifetime totals (past + this season) captioned All time", () => {
        const s = youStats({ released: true, tally: { wins: 1, noms: 2 }, noms: null, past: { wins: 3, noms: 7 } })
        expect(s.tiles.map((x) => [x.label, x.value, x.caption])).toEqual([["Wins", "4", "All time"], ["Noms", "9", "All time"], ["Win rate", "44.44%", "All time"]])
    })
    it("before release only this season's wins stay hidden: past shows, this season's noms are added", () => {
        const s = youStats({ released: false, tally: { wins: 9, noms: 9 }, noms: 2, past: { wins: 3, noms: 7 } })
        expect(s.tiles.map((x) => [x.label, x.value, Boolean(x.locked)])).toEqual([["Wins", "3", false], ["Noms", "9", false], ["Win rate", "42.86%", false]])
        expect(JSON.stringify(s)).not.toContain("12")
    })
    it("a member with no past rows (0 / 0) and no nominations: zeros and a dash, no NaN", () => {
        for (const released of [true, false]) {
            const s = youStats({ released, tally: released ? { wins: 0, noms: 0 } : null, noms: 0, past: { wins: 0, noms: 0 } })
            expect(s.tiles.map((x) => x.value)).toEqual(["0", "0", "—"])
        }
        expect(youStats({ released: true, tally: null, noms: null, past: { wins: 0, noms: 0 } }).tiles.map((x) => x.value)).toEqual(["0", "0", "—"])
    })
    it("the dash tile has an accessible label", () => {
        const t = youStats({ released: true, tally: null, noms: null, past: { wins: 0, noms: 0 } }).tiles[2]
        expect([t.value, t.aria]).toEqual(["—", "No nominations yet"])
    })
    it("without past (table missing) the old behavior stays", () => {
        expect(youStats({ released: false, tally: null, noms: 4, past: null }).tiles[0].locked).toBe(true)
    })
})
