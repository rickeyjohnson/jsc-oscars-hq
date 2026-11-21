import { describe, expect, it } from "vitest"
import { detailToForm, isDirty } from "./draftForm"
import { toLocalInput } from "./time"
import { ballot, category, nominee } from "../test/fixtures"

describe("draft form", () => {
    it("turns a saved draft into form data with local times", () => {
        const d = ballot({ name: "Fall", status: "draft", opens_at: "2026-11-25T14:00:00.000Z", closes_at: "2026-11-29T20:00:00.000Z", categories: [category("c1", "Best", [nominee("n1", "Ann")])] })
        const f = detailToForm(d)
        expect(f.name).toBe("Fall")
        expect(f.season_id).toBe("S1")
        expect(f.opens_at).toBe(toLocalInput("2026-11-25T14:00:00.000Z"))
        expect(new Date(f.closes_at).toISOString()).toBe("2026-11-29T20:00:00.000Z")
        expect(f.categories[0].nominees[0].display_name).toBe("Ann")
    })
    it("dirty only when the form changed since it was saved or loaded", () => {
        const f = detailToForm(ballot({ categories: [category("c1", "Best", [])] }))
        expect(isDirty(f, f)).toBe(false)
        expect(isDirty({ ...f, name: "Other" }, f)).toBe(true)
        expect(isDirty({ ...f, categories: [] }, f)).toBe(true)
    })
})
