import { describe, expect, it } from "vitest"
import { WIDGETS } from "../logic/homeWidgets"
import { defaultPrefs, homePrefsKey, loadHomePrefs, moveWidget, normalizePrefs, saveHomePrefs, toggleWidget } from "../logic/homePrefs"

describe("normalizePrefs", () => {
    it("falls back to default for garbage or stale versions", () => {
        expect(normalizePrefs("garbage", false)).toEqual(defaultPrefs(false))
        expect(normalizePrefs(null, true)).toEqual(defaultPrefs(true))
        expect(normalizePrefs({ version: 0, order: ["pending"], hidden: [] }, false)).toEqual(defaultPrefs(false))
    })
    it("drops unknown ids and dedupes", () => {
        const p = normalizePrefs({ version: 1, order: ["bogus", "pending", "pending"], hidden: ["nope"] }, false)
        expect(p.order[0]).toBe("pending")
        expect(p.order.filter((x) => x === "pending")).toHaveLength(1)
        expect(p.hidden).not.toContain("nope")
    })
    it("appends missing ids, hidden when not default", () => {
        const p = normalizePrefs({ version: 1, order: ["pending"], hidden: [] }, false)
        expect(p.order).toHaveLength(WIDGETS.length)
        expect(p.hidden).toContain("notVoted")
        expect(p.hidden).not.toContain("ceremony")
    })
})

describe("move/toggle", () => {
    const p = defaultPrefs(false)
    it("moves and no-ops at the ends", () => {
        expect(moveWidget(p, "countdown", -1).order.slice(0, 2)).toEqual(["countdown", "ceremony"])
        expect(moveWidget(p, "ceremony", -1)).toEqual(p)
        const last = p.order[p.order.length - 1]
        expect(moveWidget(p, last, 1)).toEqual(p)
    })
    it("toggles hidden", () => {
        const off = toggleWidget(p, "countdown", false)
        expect(off.hidden).toContain("countdown")
        expect(toggleWidget(off, "countdown", true).hidden).not.toContain("countdown")
        expect(toggleWidget(off, "countdown", false).hidden.filter((x) => x === "countdown")).toHaveLength(1)
    })
})

describe("storage", () => {
    it("uses a versioned per-user key", () => expect(homePrefsKey("u1")).toBe("jsc.home.v1.u1"))
    it("load survives throwing, missing, and bad JSON storage", () => {
        expect(loadHomePrefs({ getItem: () => { throw new Error() } }, "u", false)).toEqual(defaultPrefs(false))
        expect(loadHomePrefs(null, "u", false)).toEqual(defaultPrefs(false))
        expect(loadHomePrefs({ getItem: () => "{not json" }, "u", false)).toEqual(defaultPrefs(false))
    })
    it("round-trips and save never throws", () => {
        const store: Record<string, string> = {}
        const p = toggleWidget(defaultPrefs(false), "countdown", false)
        saveHomePrefs({ setItem: (k, v) => void (store[k] = v) }, "u", p)
        expect(loadHomePrefs({ getItem: (k) => store[k] ?? null }, "u", false)).toEqual(p)
        expect(() => saveHomePrefs({ setItem: () => { throw new Error() } }, "u", p)).not.toThrow()
        expect(() => saveHomePrefs(null, "u", p)).not.toThrow()
    })
})
