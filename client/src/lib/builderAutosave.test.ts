// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { clearAutosave, hasWork, readAutosave, worthRestoring, writeAutosave } from "./builderAutosave"
import type { BallotFormData } from "../types"

const form = (over: Partial<BallotFormData> = {}): BallotFormData => ({ season_id: "s", name: "Fall", opens_at: "", closes_at: "", categories: [], ...over })

describe("builder autosave", () => {
    beforeEach(() => localStorage.clear())
    it("round-trips per user and slot", () => {
        writeAutosave(localStorage, "u1", "new", form())
        expect(readAutosave(localStorage, "u1", "new")?.form.name).toBe("Fall")
        expect(readAutosave(localStorage, "u2", "new")).toBeNull()
        expect(readAutosave(localStorage, "u1", "d1")).toBeNull()
    })
    it("stores nothing for an empty form and clears the slot", () => {
        writeAutosave(localStorage, "u1", "new", form())
        writeAutosave(localStorage, "u1", "new", form({ name: "" }))
        expect(readAutosave(localStorage, "u1", "new")).toBeNull()
        writeAutosave(localStorage, "u1", "new", form())
        clearAutosave(localStorage, "u1", "new")
        expect(readAutosave(localStorage, "u1", "new")).toBeNull()
    })
    it("ignores corrupt data and missing storage", () => {
        localStorage.setItem("jsc.builderAutosave.u1.new", "{nope")
        expect(readAutosave(localStorage, "u1", "new")).toBeNull()
        expect(() => writeAutosave(null, "u1", "new", form())).not.toThrow()
    })
    it("offers a restore only when it differs from the current form", () => {
        writeAutosave(localStorage, "u1", "new", form())
        const stored = readAutosave(localStorage, "u1", "new")
        expect(worthRestoring(stored, form())).toBe(false)
        expect(worthRestoring(stored, form({ name: "" }))).toBe(true)
        expect(worthRestoring(null, form())).toBe(false)
        expect(hasWork(form({ name: " " }))).toBe(false)
    })
})
