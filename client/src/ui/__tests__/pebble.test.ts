import { describe, expect, it } from "vitest"
import { MEMBERS } from "../../test/fixtures"
import { HERO_EXCLUDE, PEBBLES, RESULTS_EXCLUDE, STATUS_PEBBLE, pebbleAt, pebbleFor } from "../logic/pebble"

describe("pebbles", () => {
    it("has seven pebbles", () => expect(PEBBLES).toHaveLength(7))
    it("is stable per key and spreads across members", () => {
        expect(pebbleFor("m-Micah")).toBe(pebbleFor("m-Micah"))
        expect(new Set(MEMBERS.map((m) => pebbleFor(m.id))).size).toBeGreaterThanOrEqual(5)
    })
    it("small text never gets grape", () => {
        for (const m of MEMBERS) expect(pebbleFor(m.id, { smallText: true })).not.toBe("grape")
    })
    it("respects exclusions", () => {
        for (let i = 0; i < 40; i++) {
            expect(pebbleAt(i, { exclude: HERO_EXCLUDE })).not.toBe("lemon")
            expect(RESULTS_EXCLUDE).not.toContain(pebbleAt(i, { exclude: RESULTS_EXCLUDE }))
        }
    })
    it("rotates in palette order", () => {
        expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => pebbleAt(i))).toEqual(["strawberry", "cherry", "tangerine", "lemon", "lime", "sky", "grape", "strawberry"])
        expect(pebbleAt(-1)).toBe("grape")
    })
    it("falls back to strawberry when nothing is allowed", () => {
        expect(pebbleFor("x", { exclude: PEBBLES })).toBe("strawberry")
    })
    it("status map never uses cherry", () => {
        expect(Object.values(STATUS_PEBBLE)).not.toContain("cherry")
    })
    it("freezes the mapping", () => {
        expect(pebbleFor("m-Rickey")).toBe("lemon")
    })
})
