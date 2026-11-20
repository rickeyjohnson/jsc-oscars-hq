import { describe, it, expect } from "vitest"
import { parseCategoryImport } from "./categoryImport"

describe("parseCategoryImport", () => {
    it("parses pipe lines", () => {
        expect(parseCategoryImport("Best Locs | Who has the best locs\nMegaphone Award | Loudest").categories)
            .toEqual([{ name: "Best Locs", description: "Who has the best locs" }, { name: "Megaphone Award", description: "Loudest" }])
    })
    it("parses csv with header", () => {
        expect(parseCategoryImport('name,description\n"Hook, Line & Sinker",Falls for everything').categories)
            .toEqual([{ name: "Hook, Line & Sinker", description: "Falls for everything" }])
    })
    it("handles bare names and blanks", () => {
        expect(parseCategoryImport("  \nMr. Niche Award  \n\n").categories).toEqual([{ name: "Mr. Niche Award", description: "" }])
    })
    it("splits on first pipe only", () => {
        expect(parseCategoryImport("A | b | c").categories).toEqual([{ name: "A", description: "b | c" }])
    })
    it("reports case-insensitive duplicates", () => {
        expect(parseCategoryImport("Best Locs|x\nbest locs|y")).toEqual({ categories: [{ name: "Best Locs", description: "x" }], duplicates: ["best locs"] })
    })
    it("strips a BOM before the csv header", () => {
        expect(parseCategoryImport("\uFEFFname,description\nA,b").categories).toEqual([{ name: "A", description: "b" }])
    })
    it("parses csv mode with CRLF", () => {
        expect(parseCategoryImport("name,description\r\nA,b\r\nC,d\r\n").categories)
            .toEqual([{ name: "A", description: "b" }, { name: "C", description: "d" }])
    })
    it("returns nothing for empty input", () => {
        expect(parseCategoryImport("")).toEqual({ categories: [], duplicates: [] })
    })
})
