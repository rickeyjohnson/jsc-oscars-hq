import { describe, expect, it } from "vitest"
import { JACKPOT_ODDS, jackpotShare, outcomeOf, PAIR_ODDS, spinReels } from "./slots"
import { rng } from "./rng"

describe("slot machine", () => {
    it("classifies outcomes", () => {
        expect(outcomeOf([1, 1, 1])).toBe("jackpot")
        expect(outcomeOf([1, 2, 1])).toBe("pair")
        expect(outcomeOf([1, 2, 3])).toBe("miss")
    })
    it("always returns valid faces", () => {
        const r = rng(3)
        for (let i = 0; i < 500; i++) for (const f of spinReels(r, 14)) expect(f >= 0 && f < 14).toBe(true)
    })
    it("hits roughly the intended odds over many spins", () => {
        const r = rng(11)
        const N = 6000
        const tally = { jackpot: 0, pair: 0, miss: 0 }
        for (let i = 0; i < N; i++) tally[outcomeOf(spinReels(r, 14))]++
        expect(Math.abs(tally.jackpot / N - JACKPOT_ODDS)).toBeLessThan(0.02)
        expect(Math.abs(tally.pair / N - PAIR_ODDS)).toBeLessThan(0.03)
    })
    it("builds a short jackpot share text", () => {
        expect(jackpotShare("Rico", 12, 1, "https://x.test")).toBe("JSC Oscars Slot Machine\n🎰 JACKPOT! Rico x3\n12 spins, 1 jackpot\nhttps://x.test")
        expect(jackpotShare("Rico", 1, 1, "https://x.test")).toContain("1 spin, 1 jackpot")
    })
    it("survives tiny member lists", () => {
        const r = rng(5)
        for (const n of [1, 2, 3]) for (let i = 0; i < 50; i++) expect(spinReels(r, n)).toHaveLength(3)
    })
})
