import { describe, expect, it } from "vitest"
import { COLORS, CONTRAST_PAIRS, DECORATIVE_PAIRS, PEBBLE_COLORS, REJECTED_PAIRS, type PebbleName } from "../tokens"
import { contrastRatio } from "../logic/contrast"
import { PEBBLES, SMALL_TEXT_OK } from "../logic/pebble"

function resolve(name: string): string {
    if (name.startsWith("pebble:")) return PEBBLE_COLORS[name.slice(7) as PebbleName].bg
    if (name.startsWith("on:")) return PEBBLE_COLORS[name.slice(3) as PebbleName].on
    if (name.startsWith("#")) return name
    return COLORS[name as keyof typeof COLORS]
}

describe("contrast", () => {
    it("matches WCAG reference values", () => {
        expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1)
        expect(contrastRatio("rgb(255 250 221 / .68)", "#3F3F46")).toBeCloseTo(5.6, 1)
    })

    it.each(CONTRAST_PAIRS.map((p) => [`${p.fg} on ${p.bg}`, p] as const))("%s", (_n, p) => {
        const r = contrastRatio(resolve(p.fg), resolve(p.bg))
        expect(r).toBeGreaterThanOrEqual(p.min)
        expect(r).toBeCloseTo(p.expect, 1)
    })

    it("rejected and decorative pairs keep their documented ratios", () => {
        for (const p of [...REJECTED_PAIRS, ...DECORATIVE_PAIRS]) {
            expect(contrastRatio(resolve(p.fg), resolve(p.bg))).toBeCloseTo(p.expect, 1)
        }
        for (const p of REJECTED_PAIRS) {
            const n = p.bg.slice(7) as PebbleName
            expect(contrastRatio(PEBBLE_COLORS[n].on, PEBBLE_COLORS[n].bg)).toBeGreaterThan(p.expect)
        }
    })

    it("on-colors are chosen by contrast", () => {
        for (const n of PEBBLES) {
            const { on, bg } = PEBBLE_COLORS[n]
            expect(contrastRatio(on, bg)).toBeGreaterThanOrEqual(contrastRatio("#FFFFFF", bg))
        }
    })

    it("small-text pebbles are all but grape", () => {
        expect(SMALL_TEXT_OK).toEqual(["strawberry", "cherry", "tangerine", "lemon", "lime", "sky"])
    })

    it("inverse and lime-deep pairs", () => {
        expect(contrastRatio(COLORS["on-inverse"], COLORS.inverse)).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(PEBBLE_COLORS.lemon.on, COLORS["lime-deep"])).toBeCloseTo(6.16, 1)
    })
})
