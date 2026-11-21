import { describe, expect, it } from "vitest"
import { nextSegment } from "../logic/segmented"

describe("nextSegment", () => {
    it("arrows wrap, Home/End jump, others null", () => {
        expect(nextSegment(0, "ArrowRight", 2)).toBe(1)
        expect(nextSegment(1, "ArrowRight", 2)).toBe(0)
        expect(nextSegment(0, "ArrowLeft", 3)).toBe(2)
        expect(nextSegment(1, "ArrowDown", 3)).toBe(2)
        expect(nextSegment(1, "ArrowUp", 3)).toBe(0)
        expect(nextSegment(2, "Home", 3)).toBe(0)
        expect(nextSegment(0, "End", 3)).toBe(2)
        expect(nextSegment(0, "a", 3)).toBeNull()
    })
})
