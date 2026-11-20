import { describe, expect, it } from "vitest"
import { PEBBLE_COLORS } from "../tokens"
import { contrastRatio } from "../logic/contrast"
import { WIDGETS, resolveWidgets, widgetColor } from "../logic/homeWidgets"
import { defaultPrefs } from "../logic/homePrefs"
import { applyGroupOrder, dropIndex, moveToGap } from "../logic/dragReorder"

const rects = [
    { top: 0, height: 40 },
    { top: 40, height: 40 },
    { top: 80, height: 40 },
]

describe("dropIndex", () => {
    it("returns the gap index by row midpoints", () => {
        expect(dropIndex(rects, -50)).toBe(0)
        expect(dropIndex(rects, 19)).toBe(0)
        expect(dropIndex(rects, 21)).toBe(1)
        expect(dropIndex(rects, 61)).toBe(2)
        expect(dropIndex(rects, 101)).toBe(3)
        expect(dropIndex(rects, 999)).toBe(3)
        expect(dropIndex([], 10)).toBe(0)
    })
    it("moveToGap accounts for the removed row", () => {
        expect(moveToGap(["a", "b", "c"], 0, 3)).toEqual(["b", "c", "a"])
        expect(moveToGap(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"])
        expect(moveToGap(["a", "b", "c"], 1, 2)).toEqual(["a", "b", "c"])
        expect(moveToGap(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"])
    })
    it("applyGroupOrder rewrites only the group's slots in the full order", () => {
        const p = { version: 1 as const, order: ["ceremony", "notVoted", "pending", "attention"] as never[], hidden: [] }
        const out = applyGroupOrder(p, ["ceremony", "pending"] as never[], ["pending", "ceremony"] as never[])
        expect(out.order).toEqual(["pending", "notVoted", "ceremony", "attention"])
    })
})

describe("widget registry rework", () => {
    it("adds the ready widgets, all default OFF, admin flags right", () => {
        const byId = Object.fromEntries(WIDGETS.map((w) => [w.id, w]))
        for (const id of ["ballotCloses", "yourStats", "ballotHealth", "tiebreak", "revealReadiness"]) {
            expect(byId[id].defaultMember).toBe(false)
            expect(byId[id].defaultCommittee).toBe(false)
        }
        expect(WIDGETS.filter((w) => w.adminOnly).map((w) => w.id).sort()).toEqual(["attention", "ballotHealth", "notVoted", "quickActions", "revealReadiness", "tiebreak"])
        expect(byId.yourStats.requiresRelease).toBe(true)
    })
    it("default layouts stay 5 / 6 / 7", () => {
        expect(resolveWidgets(null, { isCommittee: false, released: false })).toHaveLength(5)
        expect(resolveWidgets(null, { isCommittee: false, released: true })).toHaveLength(6)
        expect(resolveWidgets(null, { isCommittee: true, released: false })).toHaveLength(7)
        expect(resolveWidgets(defaultPrefs(true), { isCommittee: true, released: false })).toHaveLength(7)
    })
    it("members never get admin-only widgets, even if every widget is saved on", () => {
        const all = WIDGETS.map((w) => w.id)
        const out = resolveWidgets({ version: 1, order: all, hidden: [] }, { isCommittee: false, released: true })
        expect(out.some((w) => w.adminOnly)).toBe(false)
        expect(out.map((w) => w.id)).toContain("ballotCloses")
    })
})

describe("widget colors", () => {
    it("maps widget id to color (snapshot)", () => {
        expect(Object.fromEntries(WIDGETS.map((w) => [w.id, widgetColor(w.id)]))).toMatchInlineSnapshot(`
          {
            "attention": "cherry",
            "ballotCloses": "lime",
            "ballotHealth": "lime",
            "ceremony": "lemon",
            "countdown": "lemon",
            "latestWinners": "tangerine",
            "leaderboardPeek": "strawberry",
            "notVoted": "grape",
            "pending": "lime",
            "progress": "sky",
            "quickActions": "ink",
            "revealReadiness": "lemon",
            "tiebreak": "tangerine",
            "yourStats": "tangerine",
          }
        `)
    })
    it("every pebble-colored widget keeps readable ink (grape: large text only)", () => {
        for (const w of WIDGETS) {
            const c = widgetColor(w.id)
            if (c === "ink") continue
            const r = contrastRatio(PEBBLE_COLORS[c].on, PEBBLE_COLORS[c].bg)
            expect(r).toBeGreaterThanOrEqual(c === "grape" ? 3 : 4.5)
        }
    })
})
