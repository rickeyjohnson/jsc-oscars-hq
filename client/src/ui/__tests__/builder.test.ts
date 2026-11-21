import { describe, expect, it } from "vitest"
import { BUILDER_STEPS, moveCategory, stepIssues } from "../logic/builder"
import { validateBallotForPublish } from "../../lib/ballotForm"
import type { BallotFormData, Category } from "../../types"

const c = (id: string, order: number): Category => ({ id, name: id, description: "", order, nominee_mode: "everyone", allow_member_add: false, nominees: [] })
const form: BallotFormData = { season_id: "S", name: "Main", opens_at: "2026-11-26T10:00", closes_at: "2026-11-26T12:00", categories: [c("a", 0)] }

describe("builder logic", () => {
    it("has three steps", () => expect(BUILDER_STEPS.map((s) => s.label)).toEqual(["Details", "Categories", "Review"]))
    it("details issues", () => {
        expect(stepIssues("details", form)).toEqual([])
        expect(stepIssues("details", { ...form, name: " " })).toContain("Add a ballot name")
        expect(stepIssues("details", { ...form, opens_at: "2026-11-26T12:00", closes_at: "2026-11-26T11:00" })).toContain("Closing time must be after opening time")
    })
    it("categories issues", () => {
        expect(stepIssues("categories", { ...form, categories: [] })).toEqual(["Add at least one category"])
        expect(stepIssues("categories", form)).toEqual([])
    })
    it("review issues equal publish validation", () => expect(stepIssues("review", form)).toEqual(validateBallotForPublish(form)))
    it("moveCategory renumbers order", () => {
        expect(moveCategory([c("a", 0), c("b", 1), c("c", 2)], 2, 0).map((x) => [x.id, x.order])).toEqual([["c", 0], ["a", 1], ["b", 2]])
        expect(moveCategory([c("a", 0), c("b", 1)], 0, 1).map((x) => x.id)).toEqual(["b", "a"])
    })
})
