import { describe, expect, it } from "vitest"
import { colX, niceMax, polyPoints, runs, stripLayout, ticks } from "../logic/chartGeom"

describe("chartGeom", () => {
    it("niceMax rounds up to the step, at least one step", () => {
        expect(niceMax(0, 5)).toBe(5)
        expect(niceMax(21, 5)).toBe(25)
        expect(niceMax(40, 20)).toBe(40)
    })
    it("ticks are whole and unique", () => {
        expect(ticks(5)).toEqual([0, 2, 3, 5])
        expect(ticks(30)).toEqual([0, 10, 20, 30])
        expect(ticks(1)).toEqual([0, 0, 1].filter((v, i, a) => a.indexOf(v) === i))
    })
    it("runs split at gaps and never bridge them", () => {
        expect(runs([1, 2, null, 4, null, null, 7, 8])).toEqual([[[0, 1], [1, 2]], [[3, 4]], [[6, 7], [7, 8]]])
        expect(runs([null, null])).toEqual([])
        expect(runs([])).toEqual([])
    })
    it("polyPoints and colX", () => {
        expect(polyPoints([[0, 10], [1, 20]], (i) => i * 10, (v) => 100 - v)).toBe("0.0,90.0 10.0,80.0")
        expect(colX(0, 4, 20, 100)).toBe(32.5)
    })
    it("stripLayout stacks colliding dots and handles equal values", () => {
        const l = stripLayout({ a: 1, b: 1, c: 1 }, 300)
        expect(l.map((d) => d.x)).toEqual([0.5, 0.5, 0.5])
        expect(l.map((d) => d.row)).toEqual([0, 1, 2])
        const s = stripLayout({ a: 0, b: 10 }, 300)
        expect(s.map((d) => [d.id, d.x, d.row])).toEqual([["a", 0, 0], ["b", 1, 0]])
        expect(stripLayout({}, 300)).toEqual([])
    })
})
