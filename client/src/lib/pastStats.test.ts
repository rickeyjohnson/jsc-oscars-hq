import { describe, expect, it } from "vitest"
import { semesters, type PastStatRow } from "./pastStats"

const row = (season_label: string, season_order: number, name: string, noms: number, wins: number): PastStatRow => ({ season_label, season_order, member_id: `m-${name}`, noms, wins })
const rows = [row("Fall 25", 4, "Anthony", 17, 3), row("Spring 24", 1, "Anthony", 9, 4), row("Fall 25", 4, "Demichael", 16, 4)]

describe("semesters", () => {
    it("is chronological by order, one entry per label", () => {
        expect(semesters(rows)).toEqual([{ label: "Spring 24", order: 1 }, { label: "Fall 25", order: 4 }])
        expect(semesters([])).toEqual([])
    })
    it("equal order falls back to the label", () => {
        expect(semesters([row("B", 1, "x", 1, 0), row("A", 1, "x", 1, 0)]).map((s) => s.label)).toEqual(["A", "B"])
    })
})
