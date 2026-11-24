import { describe, expect, it } from "vitest"
import { buildModel } from "./statsLab"
import { wrappedSlides } from "./wrapped"

const rows = [
    { season_label: "Fall 25", season_order: 1, member_id: "a", noms: 4, wins: 2 },
    { season_label: "Fall 25", season_order: 1, member_id: "b", noms: 4, wins: 1 },
    { season_label: "Spring 26", season_order: 2, member_id: "a", noms: 3, wins: 0 },
]
const model = buildModel({ rows: rows as never, members: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }] })

describe("wrappedSlides", () => {
    it("builds intro, noms, wins and a rank for a played season", () => {
        const s = wrappedSlides(model, "a", 0)
        expect(s.map((x) => x.key)).toEqual(expect.arrayContaining(["intro", "noms", "wins", "rank"]))
        expect(s.find((x) => x.key === "wins")?.big).toBe("2")
        expect(s.find((x) => x.key === "rank")?.big).toBe("1st")
    })
    it("adds a career slide after the first season", () => {
        expect(wrappedSlides(model, "a", 1).find((x) => x.key === "career")?.big).toBe("2")
    })
    it("says so when the member sat a season out", () => {
        expect(wrappedSlides(model, "c", 0)).toHaveLength(1)
        expect(wrappedSlides(model, "c", 0)[0].big).toBe("Sat this one out")
    })
})
