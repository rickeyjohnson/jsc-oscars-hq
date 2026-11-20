import { describe, it, expect } from "vitest"
import { buildNomineeRows, validateBallotForPublish } from "./ballotForm"
import type { BallotFormData, Category, Member, Nominee } from "../types"

const names = ["Zed", "Anthony", "Nick", "Evan"]
const members: Member[] = names.map((n) => ({ id: `m-${n}`, name: n, user_id: null }))
const cat = (o: Partial<Category> = {}): Category => ({
    id: "c", name: "Cat", description: "", order: 0, nominee_mode: "everyone", allow_member_add: false, nominees: [], ...o,
})
const nom = (n: string): Nominee => ({ id: n, display_name: n, type: "person", member_ids: [`m-${n}`] })
const validForm: BallotFormData = {
    season_id: "s1", name: "Main", opens_at: "2026-11-25T18:00", closes_at: "2026-11-26T18:00",
    categories: [cat({ name: "Everyone Cat" })],
}

describe("buildNomineeRows", () => {
    it("everyone: all members sorted", () => {
        const rows = buildNomineeRows(cat(), members)
        expect(rows).toHaveLength(4)
        expect(rows[0]).toEqual({ display_name: "Anthony", secondary_text: null, type: "person", member_ids: ["m-Anthony"] })
    })
    it("group: none", () => expect(buildNomineeRows(cat({ nominee_mode: "group" }), members)).toEqual([]))
    it("subset: maps nominees", () => {
        expect(buildNomineeRows(cat({ nominee_mode: "subset", nominees: [nom("Nick"), nom("Evan")] }), members).map((n) => n.display_name)).toEqual(["Nick", "Evan"])
    })
})

describe("validateBallotForPublish", () => {
    it("valid", () => expect(validateBallotForPublish(validForm)).toEqual([]))
    it("name", () => expect(validateBallotForPublish({ ...validForm, name: "" })).toContain("Ballot name is required"))
    it("season", () => expect(validateBallotForPublish({ ...validForm, season_id: "" })).toContain("Select a season"))
    it("times", () => expect(validateBallotForPublish({ ...validForm, closes_at: validForm.opens_at })).toContain("Closing time must be after opening time"))
    it("no categories", () => expect(validateBallotForPublish({ ...validForm, categories: [] })).toContain("Add at least one category"))
    it("empty subset", () => {
        expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "Best Locs", nominee_mode: "subset" })] })).toContain('Category "Best Locs" needs at least one nominee')
    })
    it("preset with member add ok", () => {
        expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "Car", nominee_mode: "preset", allow_member_add: true })] })).toEqual([])
    })
    it("duplicates", () => {
        expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "A" }), cat({ name: "a" })] })).toContain('Duplicate category name "a"')
    })
})
