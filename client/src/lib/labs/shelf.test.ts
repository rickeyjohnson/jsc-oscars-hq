import { describe, expect, it } from "vitest"
import { buildShelf, chunk } from "./shelf"
import { buildModel } from "../statsLab"

const members = [{ id: "mA", name: "A" }, { id: "mB", name: "B" }]
const row = (id: string, order: number, noms: number, wins: number) => ({ season_label: `Fall ${20 + order}`, season_order: order, member_id: id, noms, wins })
const model = buildModel({ rows: [row("mA", 1, 5, 2), row("mA", 2, 4, 1), row("mB", 2, 3, 0)], members })

describe("trophy shelf", () => {
    it("one trophy per win, newest semester first, only wins", () => {
        const t = buildShelf(model, "mA", [])
        expect(t.map((x) => x.semester)).toEqual(["Fall 22", "Fall 21", "Fall 21"])
        expect(t.every((x) => x.award === null)).toBe(true)
        expect(buildShelf(model, "mB", [])).toEqual([])
    })
    it("named awards take the first slots of their semester", () => {
        const t = buildShelf(model, "mA", [{ id: "a1", member_id: "mA", semester: "Fall 21", award: "Best Dressed" }])
        const fall21 = t.filter((x) => x.semester === "Fall 21")
        expect(fall21.map((x) => x.award)).toEqual(["Best Dressed", null])
        expect(t).toHaveLength(3)
    })
    it("keeps awards outside the stats or beyond the win count, and ignores other members", () => {
        const t = buildShelf(model, "mA", [
            { id: "a2", member_id: "mA", semester: "Fall 19", award: "Old One" },
            { id: "a3", member_id: "mA", semester: "Fall 22", award: "X" },
            { id: "a4", member_id: "mA", semester: "Fall 22", award: "Y" },
            { id: "z", member_id: "mB", semester: "Fall 22", award: "Not mine" },
        ])
        expect(t.map((x) => x.award)).toEqual(["X", "Y", null, null, "Old One"])
    })
    it("chunks into shelves", () => {
        expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]])
        expect(chunk([], 5)).toEqual([])
    })
})
