import { describe, expect, it } from "vitest"
import { loadReduceMotion, saveReduceMotion } from "../logic/motionPref"

const mem = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe("motionPref", () => {
    it("round trips and defaults to off", () => {
        const s = mem()
        expect(loadReduceMotion(s)).toBe(false)
        saveReduceMotion(s, true)
        expect(loadReduceMotion(s)).toBe(true)
        saveReduceMotion(s, false)
        expect(loadReduceMotion(s)).toBe(false)
    })
    it("survives missing or throwing storage", () => {
        expect(loadReduceMotion(null)).toBe(false)
        expect(loadReduceMotion({ getItem: () => { throw new Error("x") } })).toBe(false)
        expect(() => saveReduceMotion({ setItem: () => { throw new Error("x") }, removeItem: () => {} }, true)).not.toThrow()
    })
})
