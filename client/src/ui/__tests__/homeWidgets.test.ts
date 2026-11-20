import { describe, expect, it } from "vitest"
import { WIDGETS, resolveWidgets } from "../logic/homeWidgets"

const ids = (w: { id: string }[]) => w.map((x) => x.id)

describe("resolveWidgets", () => {
    it("member defaults: 5 before release, 6 after", () => {
        expect(ids(resolveWidgets(null, { isCommittee: false, released: false }))).toEqual(["ceremony", "countdown", "pending", "progress", "latestWinners"])
        expect(resolveWidgets(null, { isCommittee: false, released: true })).toHaveLength(6)
    })
    it("committee defaults: 7", () => {
        expect(ids(resolveWidgets(null, { isCommittee: true, released: false }))).toEqual(["ceremony", "pending", "progress", "latestWinners", "notVoted", "attention", "quickActions"])
    })
    it("never shows admin-only widgets to non-committee, even if saved", () => {
        const prefs = { version: 1 as const, order: ["notVoted", "attention", "quickActions", "ceremony"], hidden: [] }
        for (const released of [false, true]) {
            const out = ids(resolveWidgets(prefs as never, { isCommittee: false, released }))
            expect(out).not.toContain("notVoted")
            expect(out).not.toContain("attention")
            expect(out).not.toContain("quickActions")
        }
    })
    it("honours hidden and order from prefs", () => {
        const order = WIDGETS.map((w) => w.id).reverse()
        const out = ids(resolveWidgets({ version: 1, order, hidden: ["pending"] }, { isCommittee: true, released: true }))
        expect(out).not.toContain("pending")
        expect(out[0]).toBe("quickActions")
    })
    it("registry flags admin-only widgets", () => {
        expect(WIDGETS.filter((w) => w.adminOnly).map((w) => w.id)).toEqual(["notVoted", "attention", "ballotHealth", "tiebreak", "revealReadiness", "quickActions"])
    })
})
