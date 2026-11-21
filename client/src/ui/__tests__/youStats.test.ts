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
})
