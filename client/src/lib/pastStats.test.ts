import { describe, expect, it } from "vitest"
import type { Member } from "../types"
import { ALL_TIME, rateText, lifetimeFor, lifetimeTotals, pastLeaderboard, semesters, winPct, type PastStatRow } from "./pastStats"

const members: Member[] = ["Anthony", "Demichael", "Micah", "Rico"].map((name) => ({ id: `m-${name}`, name, user_id: null }))
const row = (season_label: string, season_order: number, name: string, noms: number, wins: number): PastStatRow => ({ season_label, season_order, member_id: `m-${name}`, noms, wins })
const rows = [row("Fall 25", 4, "Anthony", 17, 3), row("Spring 24", 1, "Anthony", 9, 4), row("Fall 25", 4, "Demichael", 16, 4), row("Fall 25", 4, "Micah", 19, 4)]

describe("winPct", () => {
    it("rounds to 2 decimals", () => {
        expect(winPct(4, 9)).toBe("44.44%")
        expect(winPct(2, 3)).toBe("66.67%")
        expect(winPct(1, 4)).toBe("25.00%")
        expect(winPct(0, 5)).toBe("0.00%")
    })
    it("zero noms is null (a dash in the UI), never NaN or a throw", () => {
        expect(winPct(0, 0)).toBeNull()
        expect(rateText(null)).toBe("—")
        expect(rateText("25.00%")).toBe("25.00%")
    })
})

describe("semesters", () => {
    it("is chronological by order, one entry per label", () => {
        expect(semesters(rows)).toEqual([{ label: "Spring 24", order: 1 }, { label: "Fall 25", order: 4 }])
        expect(semesters([])).toEqual([])
    })
})

describe("lifetime", () => {
    it("sums past rows and optionally the current season", () => {
        expect(lifetimeTotals(rows)["m-Anthony"]).toEqual({ wins: 7, noms: 26 })
        expect(lifetimeTotals(rows, { "m-Anthony": { wins: 1, noms: 2 }, "m-Rico": { wins: 0, noms: 3 } })["m-Anthony"]).toEqual({ wins: 8, noms: 28 })
        expect(lifetimeTotals(rows, null)["m-Rico"]).toBeUndefined()
    })
    it("a member with no rows is 0 / 0", () => {
        expect(lifetimeFor("m-Rico", rows)).toEqual({ wins: 0, noms: 0 })
        expect(lifetimeFor("m-Rico", [], { "m-Rico": { wins: 1, noms: 2 } })).toEqual({ wins: 1, noms: 2 })
    })
})

describe("pastLeaderboard", () => {
    it("all time lists every member; zero-nom members sort last with no rate", () => {
        const l = pastLeaderboard(rows, members, ALL_TIME)
        expect(l.map((r) => [r.name, r.wins, r.noms, r.pct, r.rank])).toEqual([["Anthony", 7, 26, "26.92%", 1], ["Demichael", 4, 16, "25.00%", 2], ["Micah", 4, 19, "21.05%", 3], ["Rico", 0, 0, null, 4]])
    })
    it("all time with no data at all still lists everyone, alphabetical, tied", () => {
        const l = pastLeaderboard([], members, ALL_TIME)
        expect(l.map((r) => r.name)).toEqual(["Anthony", "Demichael", "Micah", "Rico"])
        expect(l.every((r) => r.rank === 1 && r.tied && r.pct === null)).toBe(true)
    })
    it("a semester shows only members with a row there", () => {
        expect(pastLeaderboard(rows, members, "Spring 24").map((r) => r.name)).toEqual(["Anthony"])
        expect(pastLeaderboard(rows, members, "Fall 25").map((r) => r.name)).toEqual(["Demichael", "Micah", "Anthony"])
    })
    it("ranks by wins then win %, ties are stable by name and share a rank", () => {
        const t = [row("S", 1, "Micah", 8, 4), row("S", 1, "Anthony", 8, 4), row("S", 1, "Demichael", 4, 4), row("S", 1, "Rico", 10, 2)]
        const l = pastLeaderboard(t, members, "S")
        expect(l.map((r) => [r.name, r.rank, r.tied])).toEqual([["Demichael", 1, false], ["Anthony", 2, true], ["Micah", 2, true], ["Rico", 4, false]])
    })
    it("a semester row with zero noms and zero wins does not divide by zero", () => {
        const l = pastLeaderboard([row("S", 1, "Rico", 0, 0)], members, "S")
        expect(l[0].pct).toBeNull()
    })
})
