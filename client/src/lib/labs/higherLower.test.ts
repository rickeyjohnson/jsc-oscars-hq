import { describe, expect, it } from "vitest"
import { METRICS, pickPair, shareText, winnerSide } from "./higherLower"
import { rng } from "./rng"
import { buildModel } from "../statsLab"

const members = ["A", "B", "C", "D"].map((n) => ({ id: `m${n}`, name: n }))
const row = (id: string, order: number, noms: number, wins: number) => ({ season_label: `Fall ${20 + order}`, season_order: order, member_id: `m${id}`, noms, wins })
const model = buildModel({
    rows: [row("A", 1, 8, 4), row("A", 2, 6, 3), row("A", 3, 7, 0), row("B", 1, 5, 1), row("B", 2, 9, 2), row("C", 1, 3, 0), row("D", 2, 4, 1), row("D", 3, 6, 5)],
    members,
})

describe("higher or lower", () => {
    it("computes every metric without crashing for every member", () => {
        for (const m of METRICS) for (const mem of members) {
            const v = m.value(model, mem.id)
            if (v !== null) expect(Number.isFinite(v)).toBe(true)
            if (v !== null) expect(typeof m.fmt(v)).toBe("string")
        }
    })
    it("pairs have different values and the right winner", () => {
        const r = rng(4)
        for (let i = 0; i < 60; i++) {
            const p = pickPair(r, model)
            expect(p).not.toBeNull()
            if (!p) continue
            expect(p.a).not.toBe(p.b)
            expect(p.va).not.toBe(p.vb)
            expect(winnerSide(p) === "a" ? p.va > p.vb : p.vb > p.va).toBe(true)
        }
    })
    it("avoids the last metric and can keep a member on one side", () => {
        const r = rng(9)
        for (let i = 0; i < 40; i++) {
            const p = pickPair(r, model, { avoidKey: "wins", keep: "mA" })
            if (!p) continue
            expect(p.metric.key).not.toBe("wins")
            expect(p.a).toBe("mA")
        }
    })
    it("builds a short share text", () => {
        expect(shareText(3, 9, "https://x.test")).toBe("JSC Oscars Higher or Lower\nStreak: 3 (best 9)\nhttps://x.test")
        expect(shareText(7, 7, "https://x.test")).toContain("Streak: 7 🔥 (new best!)")
        expect(shareText(12, 12, "https://x.test")).toContain("🔥🔥")
        expect(shareText(0, 0, "https://x.test")).toBe("JSC Oscars Higher or Lower\nStreak: 0\nhttps://x.test")
    })
    it("returns null when nobody has any stats", () => {
        expect(pickPair(rng(1), buildModel({ rows: [], members }))).toBeNull()
    })
})
