import { describe, expect, it } from "vitest"
import { creditLine } from "./voting"
import { readBuilderState, toBuilderIdeas, toDraftCategories } from "./myoc"

const members = [
    { id: "m1", name: "Sam" },
    { id: "m2", name: "Alex" },
    { id: "m3", name: "Kai" },
]

describe("creditLine", () => {
    it("shows nothing for a committee category", () => {
        expect(creditLine({}, members)).toBeNull()
        expect(creditLine({ credit_member_ids: [] }, members)).toBeNull()
        expect(creditLine({ credit_member_ids: ["gone"] }, members)).toBeNull()
    })
    it("names one, two or three people", () => {
        expect(creditLine({ credit_member_ids: ["m1"] }, members)).toBe("Idea from Sam")
        expect(creditLine({ credit_member_ids: ["m1", "m2"] }, members)).toBe("Idea from Sam and Alex")
        expect(creditLine({ credit_member_ids: ["m1", "m2", "m3"] }, members)).toBe("Idea from Sam, Alex and Kai")
    })
})

describe("MYOC hand-off credit", () => {
    it("credits the idea's author on the draft category and survives router state", () => {
        const ideas = toBuilderIdeas([{ name: "Best Locs", description: "", hint: null, author: { id: "m1" } }, { name: "Mystery", description: "", hint: null, author: { id: null } }])
        const { categories } = toDraftCategories(readBuilderState({ myocIdeas: ideas }))
        expect(categories[0].credit_member_ids).toEqual(["m1"])
        expect(categories[1].credit_member_ids).toBeUndefined()
    })
})
