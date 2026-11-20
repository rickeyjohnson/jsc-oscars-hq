import { describe, expect, it } from "vitest"
import { TOAST_MS, toastReducer } from "../logic/toast"

describe("toastReducer", () => {
    it("show replaces so only one is visible", () => {
        expect(toastReducer([{ id: 1, text: "a" }], { type: "show", item: { id: 2, text: "b" } }).map((t) => t.id)).toEqual([2])
    })
    it("dismiss of a stale id keeps the current toast", () => {
        expect(toastReducer([{ id: 2, text: "b" }], { type: "dismiss", id: 1 })).toHaveLength(1)
    })
    it("dismiss of the current id clears", () => {
        expect(toastReducer([{ id: 2, text: "b" }], { type: "dismiss", id: 2 })).toEqual([])
    })
    it("auto-dismisses after 4s", () => expect(TOAST_MS).toBe(4000))
})
