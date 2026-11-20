// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { dragOutcome } from "../logic/sheetDrag"
import { nextFocus } from "../logic/focusTrap"

describe("dragOutcome", () => {
    it("large with a medium detent steps down to medium", () => {
        expect(dragOutcome({ offsetY: 400, velocityY: 0, height: 800, detent: "large", detents: ["medium", "large"] })).toBe("medium")
    })
    it("large only dismisses", () => {
        expect(dragOutcome({ offsetY: 400, velocityY: 0, height: 800, detent: "large", detents: ["large"] })).toBe("dismiss")
    })
    it("a fast downward fling from medium dismisses", () => {
        expect(dragOutcome({ offsetY: 40, velocityY: 900, height: 800, detent: "medium", detents: ["medium", "large"] })).toBe("dismiss")
    })
    it("a small slow drag snaps back", () => {
        expect(dragOutcome({ offsetY: 40, velocityY: 100, height: 800, detent: "medium", detents: ["medium", "large"] })).toBe("medium")
    })
    it("dragging up from medium expands to large", () => {
        expect(dragOutcome({ offsetY: -200, velocityY: -100, height: 800, detent: "medium", detents: ["medium", "large"] })).toBe("large")
    })
    it("cannot expand without a large detent", () => {
        expect(dragOutcome({ offsetY: -200, velocityY: -900, height: 800, detent: "medium", detents: ["medium"] })).toBe("medium")
    })
})

describe("nextFocus", () => {
    const [a, b, c] = [0, 1, 2].map(() => document.createElement("button"))
    it("wraps forward and backward", () => {
        expect(nextFocus([a, b, c], c, false)).toBe(a)
        expect(nextFocus([a, b, c], a, true)).toBe(c)
        expect(nextFocus([a, b, c], a, false)).toBe(b)
    })
    it("enters from outside and handles empty", () => {
        expect(nextFocus([a, b, c], null, false)).toBe(a)
        expect(nextFocus([a, b, c], null, true)).toBe(c)
        expect(nextFocus([], a, false)).toBeNull()
    })
})
