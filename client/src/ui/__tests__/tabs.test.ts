import { describe, expect, it } from "vitest"
import { activeTab, collapseProgress, isTextEntry, TABS } from "../logic/tabs"

describe("activeTab", () => {
    it("resolves tabs from pathnames, including nested routes", () => {
        expect(activeTab("/app")).toBe("home")
        expect(activeTab("/app/")).toBe("home")
        expect(activeTab("/app/ballots")).toBe("ballots")
        expect(activeTab("/app/ballots/123")).toBe("ballots")
        expect(activeTab("/app/ballots/123/submit")).toBe("ballots")
        expect(activeTab("/app/results")).toBe("results")
        expect(activeTab("/app/stats")).toBe("results")
        expect(activeTab("/app/profile")).toBe("you")
        expect(activeTab("/app/profile/settings")).toBe("you")
        expect(activeTab("/app/profile/ballots/create")).toBe("you")
        expect(activeTab("/login")).toBeNull()
        expect(activeTab("/")).toBeNull()
        expect(activeTab("/application")).toBeNull()
        expect(activeTab("/app/ballotsx")).toBeNull()
    })
    it("exposes the four destinations in order", () => {
        expect(TABS.map((t) => t.label)).toEqual(["Home", "Ballots", "Results", "You"])
        expect(TABS.map((t) => t.to)).toEqual(["/app", "/app/ballots", "/app/results", "/app/profile"])
    })
})

describe("collapseProgress", () => {
    it("clamps scroll into 0..1 over the threshold", () => {
        expect(collapseProgress(-20, 40)).toBe(0)
        expect(collapseProgress(0, 40)).toBe(0)
        expect(collapseProgress(20, 40)).toBe(0.5)
        expect(collapseProgress(40, 40)).toBe(1)
        expect(collapseProgress(500, 40)).toBe(1)
        expect(collapseProgress(10, 0)).toBe(1)
    })
})

describe("isTextEntry", () => {
    it("is true for text inputs, textareas and selects only", () => {
        expect(isTextEntry({ tagName: "INPUT", type: "text" })).toBe(true)
        expect(isTextEntry({ tagName: "INPUT", type: "checkbox" })).toBe(false)
        expect(isTextEntry({ tagName: "TEXTAREA" })).toBe(true)
        expect(isTextEntry({ tagName: "SELECT" })).toBe(true)
        expect(isTextEntry({ tagName: "DIV", isContentEditable: true })).toBe(true)
        expect(isTextEntry({ tagName: "BUTTON" })).toBe(false)
        expect(isTextEntry(null)).toBe(false)
    })
})
