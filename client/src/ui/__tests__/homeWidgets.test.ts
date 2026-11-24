import { describe, expect, it } from "vitest"
import { WIDGETS, resolveWidgets } from "../logic/homeWidgets"

const ids = (w: { id: string }[]) => w.map((x) => x.id)

describe("widget blurbs", () => {
    it("every widget has a non-empty one-line blurb", () => {
        for (const w of WIDGETS) expect(w.blurb.trim().length, w.id).toBeGreaterThan(0)
    })
})

describe("resolveWidgets", () => {
    it("member defaults: 9 (incl. MYOC, hidden by Home until a window exists), still 9 after release", () => {
        expect(ids(resolveWidgets(null, { isCommittee: false, released: false }))).toEqual(["ceremony", "countdown", "pending", "ballotCloses", "progress", "myoc", "yourStats", "trophyCase", "careerLine"])
        expect(resolveWidgets(null, { isCommittee: false, released: true })).toHaveLength(9)
    })
    it("committee defaults: 10", () => {
        expect(ids(resolveWidgets(null, { isCommittee: true, released: false }))).toEqual(["ceremony", "countdown", "pending", "ballotCloses", "progress", "myoc", "yourStats", "trophyCase", "careerLine", "notVoted"])
    })
    it("never shows admin-only widgets to non-committee, even if saved", () => {
        const prefs = { version: 1 as const, order: ["notVoted", "attention", "ballotHealth", "ceremony"], hidden: [] }
        for (const released of [false, true]) {
            const out = ids(resolveWidgets(prefs as never, { isCommittee: false, released }))
            expect(out).not.toContain("notVoted")
            expect(out).not.toContain("attention")
            expect(out).not.toContain("ballotHealth")
        }
    })
    it("honours hidden and order from prefs", () => {
        const order = WIDGETS.map((w) => w.id).reverse()
        const out = ids(resolveWidgets({ version: 1, order, hidden: ["pending"] }, { isCommittee: true, released: true }))
        expect(out).not.toContain("pending")
        expect(out[0]).toBe("revealReadiness")
    })
    it("registry flags admin-only widgets", () => {
        expect(WIDGETS.filter((w) => w.adminOnly).map((w) => w.id)).toEqual(["notVoted", "attention", "ballotHealth", "tiebreak", "revealReadiness"])
    })
})
