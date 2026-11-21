import { describe, expect, it } from "vitest"
import {
    buildModel, compareMembers, expectedWins, fmtRate, groupRate, leaderboardEntries, metricValues,
    perSemesterAverage, placement, rate, shortLabel, totals, verdictOf, type StatsModel,
} from "./statsLab"
import type { PastStatRow } from "./pastStats"

const names = ["Ann", "Bo", "Cy", "Di", "Rico"]
const members = names.map((n) => ({ id: `m-${n}`, name: n }))
const row = (season_label: string, season_order: number, n: string, noms: number, wins: number): PastStatRow => ({ season_label, season_order, member_id: `m-${n}`, noms, wins })
// Fall 23 and Fall 24 are slide counts. Di is only in two semesters. Rico has no rows.
const rows: PastStatRow[] = [
    row("Fall 23", 0, "Ann", 8, 1), row("Fall 23", 0, "Bo", 16, 5),
    row("Spring 24", 1, "Ann", 9, 4), row("Spring 24", 1, "Bo", 17, 4), row("Spring 24", 1, "Di", 0, 0),
    row("Fall 24", 2, "Ann", 5, 2), row("Fall 24", 2, "Bo", 4, 1),
    row("Spring 25", 3, "Ann", 13, 6), row("Spring 25", 3, "Bo", 14, 4), row("Spring 25", 3, "Di", 6, 3),
]
const model = (current?: StatsModel["sems"][number]["label"] | null): StatsModel =>
    buildModel({ rows, members, current: current ? { label: current, tallies: { "m-Ann": { wins: 3, noms: 4 }, "m-Rico": { wins: 1, noms: 6 } } } : null })
const m = model()
const A = "m-Ann", B = "m-Bo", D = "m-Di", R = "m-Rico"

describe("labels and rates", () => {
    it("short labels", () => {
        expect(shortLabel("Fall 25")).toBe("F25")
        expect(shortLabel("Spring 24")).toBe("S24")
        expect(shortLabel("Fall 2026")).toBe("F26")
        expect(shortLabel("Odd name")).toBe("Odd ")
    })
    it("0 noms is a dash, never a divide by zero", () => {
        expect(rate(0, 0)).toBeNull()
        expect(fmtRate(null)).toBe("—")
        expect(fmtRate(33.333)).toBe("33.3%")
        expect(fmtRate(0)).toBe("0.0%")
    })
})

describe("buildModel", () => {
    it("is chronological, marks slide semesters, and a 0-nom row is a gap", () => {
        expect(m.sems.map((s) => s.label)).toEqual(["Fall 23", "Spring 24", "Fall 24", "Spring 25"])
        expect(m.sems.map((s) => s.approx)).toEqual([true, false, true, false])
        expect(m.cells[D]).toEqual([null, null, null, { noms: 6, wins: 3 }])
        expect(m.cells[R]).toEqual([null, null, null, null])
    })
    it("the current season is a last column only when given", () => {
        expect(model().sems).toHaveLength(4)
        const c = model("Fall 2026")
        expect(c.sems.at(-1)).toMatchObject({ label: "Fall 2026", short: "F26", current: true, approx: false })
        expect(c.cells[R].at(-1)).toEqual({ noms: 6, wins: 1 })
        expect(totals(c, A).wins).toBe(totals(m, A).wins + 3)
    })
    it("ignores rows of unknown members", () => {
        const x = buildModel({ rows: [...rows, row("Fall 23", 0, "Ghost", 9, 9)], members })
        expect(Object.keys(x.cells)).not.toContain("m-Ghost")
        expect(groupRate(x, 0)).toBe(groupRate(m, 0))
    })
})

describe("totals and group rate", () => {
    it("sums, counts semesters in, flags slide semesters", () => {
        expect(totals(m, A)).toEqual({ wins: 13, noms: 35, sem: 4, rate: (13 / 35) * 100, approx: true })
        expect(totals(m, A, 1)).toMatchObject({ wins: 4, noms: 9, sem: 1, approx: false })
        expect(totals(m, R)).toEqual({ wins: 0, noms: 0, sem: 0, rate: null, approx: false })
        expect(totals(m, "nobody").noms).toBe(0)
    })
    it("group rate is wins over noms of those in; null when nobody", () => {
        expect(groupRate(m, 0)).toBeCloseTo(6 / 24)
        expect(groupRate(buildModel({ rows: [], members }), 0)).toBeNull()
    })
})

describe("expected wins", () => {
    it("noms x group rate per semester, summed; gaps skipped", () => {
        const e = expectedWins(m, D)
        expect(e.perSem.slice(0, 3)).toEqual([null, null, null])
        const g = groupRate(m, 3)!
        expect(e.expected).toBeCloseTo(6 * g)
        expect(e.actual).toBe(3)
        expect(e.verdict).toBe("over")
    })
    it("verdict bands: within half a win is on par", () => {
        expect(verdictOf(0.5)).toBe("over")
        expect(verdictOf(0.49)).toBe("par")
        expect(verdictOf(-0.49)).toBe("par")
        expect(verdictOf(-0.5)).toBe("under")
    })
    it("no data: zeros, on par", () => {
        expect(expectedWins(m, R)).toMatchObject({ actual: 0, expected: 0, verdict: "par" })
    })
})

describe("placement (rank with ties, Top X%)", () => {
    const v = { a: 10, b: 8, c: 8, d: 3 }
    it("ties share the better rank and the next skips", () => {
        expect(placement(v, "a")).toEqual({ rank: 1, tied: false, n: 4, top: 25 })
        expect(placement(v, "b")).toEqual({ rank: 2, tied: true, n: 4, top: 50 })
        expect(placement(v, "c")?.rank).toBe(2)
        expect(placement(v, "d")).toEqual({ rank: 4, tied: false, n: 4, top: 100 })
    })
    it("3rd of 13 is Top 24% rounded up; no value is null", () => {
        const many = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`m${i}`, 13 - i]))
        expect(placement(many, "m2")).toMatchObject({ rank: 3, n: 13, top: 24 })
        expect(placement(many, "ghost")).toBeNull()
        expect(placement({}, "a")).toBeNull()
    })
})

describe("metricValues", () => {
    it("members without nominations are not ranked at all", () => {
        expect(Object.keys(metricValues(m, "wins"))).not.toContain(R)
    })
    it("win rate needs 10 noms all time and 5 in a semester", () => {
        expect(Object.keys(metricValues(m, "rate"))).toEqual([A, B])
        expect(metricValues(m, "rate", { k: 3 })).toHaveProperty(D)
        expect(metricValues(m, "rate", { k: 2 })).toHaveProperty(A)
        expect(metricValues(m, "rate", { k: 2 })).not.toHaveProperty(B)
    })
    it("per semester played averages wins and noms (all time only)", () => {
        const v = metricValues(m, "wins", { perSem: true })
        expect(v[A]).toBeCloseTo(13 / 4)
        expect(v[D]).toBe(3)
        expect(metricValues(m, "wins", { perSem: true, k: 1 })[A]).toBe(4)
    })
})

describe("per semester played", () => {
    it("averages over semesters in; none for a member never in", () => {
        expect(perSemesterAverage(m, A)).toEqual({ wins: 13 / 4, noms: 35 / 4, sem: 4 })
        expect(perSemesterAverage(m, D)).toEqual({ wins: 3, noms: 6, sem: 1 })
        expect(perSemesterAverage(m, R)).toBeNull()
    })
})

describe("leaderboardEntries", () => {
    it("all time lists everyone; no data last and unranked", () => {
        const e = leaderboardEntries(m, { k: null, sort: "wins" })
        expect(e.map((x) => x.name)).toEqual(["Bo", "Ann", "Di", "Cy", "Rico"])
        expect(e.at(-1)).toMatchObject({ name: "Rico", none: true, rank: null })
        expect(e.map((x) => x.rank)).toEqual([1, 2, 3, null, null])
    })
    it("a semester lists only members who were in", () => {
        expect(leaderboardEntries(m, { k: 3, sort: "wins" }).map((x) => x.name)).toEqual(["Ann", "Bo", "Di"])
        expect(leaderboardEntries(m, { k: 0, sort: "wins" }).map((x) => x.name)).toEqual(["Bo", "Ann"])
    })
    it("win % ranks only those with enough noms; the rest are listed unranked below", () => {
        const e = leaderboardEntries(m, { k: null, sort: "rate" })
        expect(e.map((x) => [x.name, x.rank, x.low])).toEqual([["Ann", 1, false], ["Bo", 2, false], ["Di", null, true], ["Cy", null, false], ["Rico", null, false]])
    })
    it("ties share a rank, ordered by name", () => {
        const t = buildModel({ rows: [row("S", 0, "Bo", 4, 2), row("S", 0, "Ann", 4, 2), row("S", 0, "Cy", 4, 1)], members })
        const e = leaderboardEntries(t, { k: 0, sort: "wins" })
        expect(e.map((x) => [x.name, x.rank, x.tied])).toEqual([["Ann", 1, true], ["Bo", 1, true], ["Cy", 3, false]])
    })
    it("per semester played re-ranks by average (all time)", () => {
        const raw = leaderboardEntries(m, { k: null, sort: "wins" }).map((x) => x.name)
        const avg = leaderboardEntries(m, { k: null, sort: "wins", perSem: true }).map((x) => x.name)
        expect(raw.slice(0, 3)).toEqual(["Bo", "Ann", "Di"])
        expect(avg.slice(0, 3)).toEqual(["Bo", "Ann", "Di"]) // 3.5, 3.25, 3
        // a newer member with fewer semesters overtakes on average
        const t = buildModel({ rows: [row("S1", 0, "Ann", 4, 1), row("S2", 1, "Ann", 4, 1), row("S3", 2, "Ann", 4, 1), row("S3", 2, "Di", 4, 2)], members })
        expect(leaderboardEntries(t, { k: null, sort: "wins" })[0].name).toBe("Ann")
        expect(leaderboardEntries(t, { k: null, sort: "wins", perSem: true })[0].name).toBe("Di")
        expect(leaderboardEntries(t, { k: 2, sort: "wins", perSem: true })[0].name).toBe("Di") // perSem is all time only
    })
})

describe("compareMembers", () => {
    it("edge counts only shared semesters", () => {
        const c = compareMembers(m, A, B)
        expect(c.shared).toBe(4)
        expect(c.aEdge + c.bEdge).toBeLessThanOrEqual(4)
        expect(c.series).toHaveLength(4)
    })
    it("fewer than 2 shared semesters: no verdict", () => {
        const c = compareMembers(m, A, D)
        expect(c.shared).toBe(1)
        expect(c.verdict).toBeNull()
        expect(compareMembers(m, A, R).shared).toBe(0)
    })
    it("even when each wins as many", () => {
        const t = buildModel({ rows: [row("S1", 0, "Ann", 10, 5), row("S1", 0, "Bo", 10, 3), row("S2", 1, "Ann", 10, 3), row("S2", 1, "Bo", 10, 5)], members })
        expect(compareMembers(t, A, B).verdict).toBe("even")
    })
})
