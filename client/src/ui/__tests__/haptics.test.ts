import { afterEach, describe, expect, it, vi } from "vitest"
import { vibrate } from "../haptics"

afterEach(() => vi.unstubAllGlobals())

describe("haptics", () => {
    it("vibrates with the pattern", () => {
        const v = vi.fn()
        vi.stubGlobal("navigator", { vibrate: v })
        vibrate("reveal")
        expect(v).toHaveBeenCalledWith([15, 60, 15])
    })
    it("is a no-op without navigator.vibrate and never throws", () => {
        vi.stubGlobal("navigator", {})
        expect(() => vibrate("submit")).not.toThrow()
        vi.stubGlobal("navigator", { vibrate: () => { throw new Error("x") } })
        expect(() => vibrate("submit")).not.toThrow()
    })
})
