import { describe, expect, it } from "vitest"
import type { Category, Nominee, ResultRow } from "../types"
import { buildCategoryViews, recordPlan, summaryLine } from "./tallyView"

const nom = (id: string, member_ids: string[] = []): Nominee => ({ id, display_name: id, type: "person", member_ids })
const cat = (id: string, order: number, nominees: Nominee[]): Category => ({ id, name: "Cat " + id, description: "", order, nominee_mode: "everyone", allow_member_add: false, nominees })
const votes = (cat: string, counts: Record<string, number>) =>
  Object.entries(counts).flatMap(([nominee_id, n]) => Array.from({ length: n }, () => ({ category_id: cat, nominee_id })))
const res = (category_id: string, over: Partial<ResultRow> = {}): ResultRow => ({ category_id, decided_ballot_id: "M", winner_nominee_id: null, nominee_ids: [], top3_nominee_ids: [], decided_by: null, ...over })

const main = [
  cat("c1", 0, [nom("A"), nom("B"), nom("C"), nom("D"), nom("E")]),
  cat("c2", 1, [nom("A"), nom("B"), nom("C")]),
  cat("c3", 2, [nom("X"), nom("Y")]),
]
const mainVotes = [...votes("c1", { A: 5, B: 3, C: 3, D: 2, E: 1 }), ...votes("c2", { A: 4, B: 4, C: 1 })]

describe("buildCategoryViews (main ballot)", () => {
  const views = buildCategoryViews({ round: "main", categories: main, mainCategories: main, votes: mainVotes, results: {}, committeeMemberIds: [] })
  it("numbers categories in ballot order with badges", () => {
    expect(views.map((v) => [v.number, v.name, v.badge])).toEqual([[1, "Cat c1", "winner"], [2, "Cat c2", "tiebreak"], [3, "Cat c3", "manual"]])
  })
  it("shows ranks 1-3 (ties included) and folds the rest", () => {
    expect(views[0].shown.map((r) => [r.nominee_id, r.votes, r.rank])).toEqual([["A", 5, 1], ["B", 3, 2], ["C", 3, 2]])
    expect(views[0].more.map((r) => r.nominee_id)).toEqual(["D", "E"])
  })
  it("manual options fall back to all category nominees", () => {
    expect(views[2].manualOptions).toEqual(["X", "Y"])
    expect(views[0].manualOptions).toEqual([])
  })
  it("a recorded winner wins the badge and hides the manual pick", () => {
    const v = buildCategoryViews({ round: "main", categories: main, mainCategories: main, votes: mainVotes, results: { c3: res("c3", { winner_nominee_id: "Y", decided_by: "manual" }) }, committeeMemberIds: [] })
    expect(v[2]).toMatchObject({ badge: "winner", recordedWinnerId: "Y", recordedBy: "manual", manualOptions: [] })
  })
  it("summary line", () => {
    expect(summaryLine(views)).toBe("3 categories · 1 tie · 1 manual pick")
  })
})

describe("buildCategoryViews (round ballots)", () => {
  const rick = "m-rick", kad = "m-kad"
  const full = [cat("c2", 1, [nom("A", ["m-a"]), nom("B", [rick]), nom("C")])]
  it("tiebreak: eligible nominees only; committee needed when a committee member is not tied", () => {
    const round = [cat("c2", 1, [nom("A", ["m-a"]), nom("B", [rick])])]
    const [v] = buildCategoryViews({ round: "tiebreak", categories: round, mainCategories: [cat("c0", 0, []), ...full], votes: votes("c2", { A: 2, B: 2, C: 9 }), results: {}, committeeMemberIds: [rick, kad] })
    expect(v.number).toBe(2)
    expect(v.tally.ranked.map((r) => r.nominee_id)).toEqual(["A", "B"])
    expect(v.badge).toBe("committee")
  })
  it("committee: a remaining tie is a manual pick between the tied nominees", () => {
    const round = [cat("c2", 1, [nom("A"), nom("B"), nom("C")])]
    const [v] = buildCategoryViews({ round: "committee", categories: round, mainCategories: full, votes: votes("c2", { A: 1, B: 1 }), results: { c2: res("c2", { nominee_ids: ["A", "B", "C"] }) }, committeeMemberIds: [rick, kad] })
    expect(v.badge).toBe("manual")
    expect(v.manualOptions).toEqual(["A", "B"])
  })
})

describe("recordPlan", () => {
  it("writes every category, skips later-round decisions and kept manual picks, counts overwrites", () => {
    const views = buildCategoryViews({ round: "main", categories: main, mainCategories: main, votes: mainVotes, results: {}, committeeMemberIds: [] })
    const results = {
      c1: res("c1", { winner_nominee_id: "B", decided_by: "votes" }),
      c2: res("c2", { decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "tiebreak" }),
      c3: res("c3", { winner_nominee_id: "Y", decided_by: "manual" }),
    }
    const plan = recordPlan("main", "M", views, results, new Set(["T"]))
    expect(plan.rows.map((r) => [r.category_id, r.winner_nominee_id])).toEqual([["c1", "A"]])
    expect(plan.overwrites).toEqual(["c1"])
    expect(plan.skipped).toEqual(["c2", "c3"])
  })
  it("round ballots keep the main nominee lists", () => {
    const round = [cat("c2", 1, [nom("A"), nom("B")])]
    const prev = res("c2", { nominee_ids: ["A", "B"], top3_nominee_ids: ["A", "B", "C"] })
    const views = buildCategoryViews({ round: "tiebreak", categories: round, mainCategories: main, votes: votes("c2", { B: 3, A: 1 }), results: { c2: prev }, committeeMemberIds: [] })
    const plan = recordPlan("tiebreak", "T", views, { c2: prev }, new Set())
    expect(plan.rows).toEqual([{ ...prev, decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "tiebreak" }])
    expect(plan.overwrites).toEqual([])
  })
})
