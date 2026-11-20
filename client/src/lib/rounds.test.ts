import { describe, expect, it } from "vitest"
import type { Nominee } from "../types"
import { manualResult, nextStep, resultForRound, roundEntries } from "./rounds"
import { tallyCategory } from "./tally"

function v(counts: Record<string, number>) {
  return Object.entries(counts).flatMap(([nominee_id, n]) =>
    Array.from({ length: n }, () => ({ category_id: "c", nominee_id })),
  )
}
const rickey = "rickey", kadin = "kadin", nick = "nick", evan = "evan"
const nominee = (id: string, member_ids: string[], type: Nominee["type"] = "person"): Nominee => ({ id, display_name: id, type, member_ids })
const person = (id: string) => nominee("p-" + id, [id])
const group = (ids: string[]) => nominee("g-" + ids.join("-"), ids, "group")
const nA = nominee("A", [nick]), nB = nominee("B", [evan])
const tied = tallyCategory("c", v({ A: 1, B: 1 }), ["A", "B"])
const prev = { category_id: "c", decided_ballot_id: "M", winner_nominee_id: null, nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: null }

describe("resultForRound", () => {
  it("main round", () => {
    expect(resultForRound("main", "M", tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2 })), null)).toEqual({ category_id: "c", decided_ballot_id: "M", winner_nominee_id: "A", nominee_ids: ["A","B","C"], top3_nominee_ids: ["A","B","C"], decided_by: "votes" })
    expect(resultForRound("main", "M", tallyCategory("c", v({ A: 4, B: 4, C: 2 })), null)).toMatchObject({ winner_nominee_id: null, nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: null })
  })
  it("tiebreak and committee rounds", () => {
    expect(resultForRound("tiebreak", "T", tallyCategory("c", v({ B: 3, A: 1 }), ["A","B"]), prev)).toEqual({ ...prev, decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "tiebreak" })
    expect(resultForRound("committee", "K", tallyCategory("c", v({ A: 2 }), ["A","B"]), prev)).toMatchObject({ winner_nominee_id: "A", decided_by: "committee_vote" })
    expect(resultForRound("committee", "K", tallyCategory("c", v({ A: 1, B: 1 }), ["A","B"]), prev)).toMatchObject({ winner_nominee_id: null, decided_by: null })
  })
})

describe("nextStep", () => {
  it("main round", () => {
    expect(nextStep("main", tallyCategory("c", v({ A: 2, B: 1 })), [], [rickey, kadin])).toBe("done")
    expect(nextStep("main", tallyCategory("c", v({ A: 2, B: 2 })), [nA, nB], [rickey, kadin])).toBe("tiebreak")
    expect(nextStep("main", tallyCategory("c", []), [], [rickey, kadin])).toBe("manual")
  })
  it("tiebreak round", () => {
    expect(nextStep("tiebreak", tied, [person(rickey), person(nick)], [rickey, kadin])).toBe("committee")
    expect(nextStep("tiebreak", tied, [person(rickey), person(kadin)], [rickey, kadin])).toBe("manual")
    expect(nextStep("tiebreak", tied, [group([rickey, kadin]), person(nick)], [rickey, kadin])).toBe("manual")
  })
  it("committee round", () => {
    expect(nextStep("committee", tied, [person(nick), person(evan)], [rickey, kadin])).toBe("manual")
    expect(nextStep("committee", tallyCategory("c", v({ A: 2 }), ["A","B"]), [], [rickey, kadin])).toBe("done")
  })
})

describe("manualResult", () => {
  it("sets the winner", () => {
    expect(manualResult(prev, "B", "T")).toEqual({ ...prev, decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "manual" })
    expect(manualResult({ ...prev, nominee_ids: [], top3_nominee_ids: [] }, "Z", "M").nominee_ids).toEqual(["Z"])
  })
})

describe("roundEntries", () => {
  const cv = (cat: string, counts: Record<string, number>) =>
    Object.entries(counts).flatMap(([nominee_id, n]) => Array.from({ length: n }, () => ({ category_id: cat, nominee_id })))
  it("tiebreak: tied-first categories with their leaders", () => {
    const tallies = [tallyCategory("c1", cv("c1", { A: 4, B: 4, C: 1 })), tallyCategory("c2", cv("c2", { A: 3, B: 1 }))]
    expect(roundEntries(tallies, "tiebreak", {})).toEqual([{ category_id: "c1", nominee_ids: ["A", "B"] }])
  })
  it("tiebreak: skips categories with no votes", () => {
    expect(roundEntries([tallyCategory("c1", [])], "tiebreak", {})).toEqual([])
  })
  it("committee: prev nominee_ids filtered to the tiebreak leaders", () => {
    const t = tallyCategory("c", v({ B: 2, C: 2, A: 1 }), ["A", "B", "C"])
    const p = { ...prev, nominee_ids: ["C", "A", "B"] }
    expect(roundEntries([t], "committee", { c: p })).toEqual([{ category_id: "c", nominee_ids: ["C", "B"] }])
    expect(roundEntries([tallyCategory("c", v({ B: 2, A: 1 }), ["A", "B"])], "committee", { c: p })).toEqual([])
    expect(roundEntries([t], "committee", {})).toEqual([{ category_id: "c", nominee_ids: ["B", "C"] }])
  })
})
