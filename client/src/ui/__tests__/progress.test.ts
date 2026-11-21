import { describe, expect, it } from "vitest"
import { dashAriaLabel, dashClass, progressLabel, segmentsTappable } from "../logic/progress"

describe("progress strip logic", () => {
    it("label and tappability", () => {
        expect(progressLabel(8, 30)).toBe("8 of 30 voted. Jump to a category")
        expect(segmentsTappable(375, 30)).toBe(false)
        expect(segmentsTappable(1040, 30)).toBe(true)
        expect(segmentsTappable(375, 0)).toBe(false)
    })
    it("maps dash state to cream classes", () => {
        expect(dashClass({ voted: true, current: false }, "horizontal")).toContain("bg-label")
        expect(dashClass({ voted: false, current: false }, "horizontal")).toContain("bg-strip-off")
        expect(dashClass({ voted: false, current: false }, "horizontal")).not.toContain("bg-label")
        const cur = dashClass({ voted: false, current: true }, "horizontal")
        expect(cur).toContain("h-[7px]")
        expect(dashClass({ voted: false, current: false }, "horizontal")).toContain("h-[5px]")
        expect(dashClass({ voted: false, current: true }, "vertical")).toContain("w-[7px]")
        expect(dashClass({ voted: true, current: true }, "horizontal")).toContain("bg-pebble-sky")
        expect(dashClass({ voted: true, current: true }, "horizontal")).not.toContain("outline")
    })
    it("failed dash is cherry and announced", () => {
        expect(dashClass({ voted: true, current: false, failed: true }, "horizontal")).toContain("bg-pebble-cherry")
        expect(dashAriaLabel(0, "X", { voted: false, current: false, failed: true })).toBe("Category 1: X, couldn't save")
    })
    it("aria label per dash", () => {
        expect(dashAriaLabel(2, "Best locs", { voted: true, current: false })).toBe("Category 3: Best locs, voted")
        expect(dashAriaLabel(0, "X", { voted: false, current: true })).toBe("Category 1: X, not voted, current")
    })
})
