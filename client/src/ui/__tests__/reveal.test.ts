import { describe, expect, it } from "vitest"
import { REVEAL_ORDER, envelopeKey, hasSeenEnvelope, loadOpened, markEnvelopeSeen, revealKey, saveOpened } from "../logic/reveal"

const memStore = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe("reveal flags", () => {
    it("round-trips opened ids per season", () => {
        const st = memStore()
        saveOpened(st, "S", new Set(["c1", "c2"]))
        expect([...loadOpened(st, "S")].sort()).toEqual(["c1", "c2"])
        expect(loadOpened(st, "other").size).toBe(0)
        expect(revealKey("S")).toBe("jsc.reveal.S")
    })
    it("never throws on bad storage", () => {
        expect(loadOpened({ getItem: () => "{bad" }, "S").size).toBe(0)
        expect(loadOpened({ getItem: () => '{"a":1}' }, "S").size).toBe(0)
        expect(loadOpened({ getItem: () => { throw new Error("denied") } }, "S").size).toBe(0)
        expect(loadOpened(null, "S").size).toBe(0)
        expect(() => saveOpened({ setItem: () => { throw new Error("quota") } }, "S", new Set(["c1"]))).not.toThrow()
        expect(() => saveOpened(null, "S", new Set())).not.toThrow()
    })
    it("reveals bronze, silver, then gold", () => {
        expect(REVEAL_ORDER).toEqual([3, 2, 1])
    })
    it("tracks the envelope as seen once per season", () => {
        const st = memStore()
        expect(hasSeenEnvelope(st, "S")).toBe(false)
        markEnvelopeSeen(st, "S")
        expect(hasSeenEnvelope(st, "S")).toBe(true)
        expect(hasSeenEnvelope(st, "T")).toBe(false)
        expect(envelopeKey("S")).toBe("jsc.envelope.S")
    })
    it("treats unreadable storage as seen so the screen never traps anyone", () => {
        expect(hasSeenEnvelope(null, "S")).toBe(true)
        expect(hasSeenEnvelope({ getItem: () => { throw new Error("denied") } }, "S")).toBe(true)
        expect(() => markEnvelopeSeen(null, "S")).not.toThrow()
    })
})
