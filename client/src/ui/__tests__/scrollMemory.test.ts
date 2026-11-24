import { describe, expect, it } from "vitest"
import { canReach, createScrollMemory } from "../logic/scrollMemory"

describe("scroll memory", () => {
    it("remembers a position per history entry", () => {
        const m = createScrollMemory()
        m.save("a", 420.4)
        m.save("b", 10)
        expect(m.get("a")).toBe(420)
        expect(m.get("b")).toBe(10)
        expect(m.get("c")).toBeUndefined()
    })
    it("forgets the oldest entries past the cap and never stores negatives", () => {
        const m = createScrollMemory(2)
        m.save("a", 1)
        m.save("b", 2)
        m.save("c", -5)
        expect(m.get("a")).toBeUndefined()
        expect(m.get("c")).toBe(0)
    })
    it("knows when the page is tall enough to restore", () => {
        expect(canReach(800, 1000, 700)).toBe(false)
        expect(canReach(800, 1600, 700)).toBe(true)
        expect(canReach(0, 100, 700)).toBe(true)
    })
})
