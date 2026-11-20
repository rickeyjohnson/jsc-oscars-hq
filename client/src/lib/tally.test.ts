import { describe, expect, it } from "vitest"
import { tallyCategory } from "./tally"

function v(counts: Record<string, number>, category = "c") {
  return Object.entries(counts).flatMap(([nominee_id, n]) =>
    Array.from({ length: n }, () => ({ category_id: category, nominee_id })),
  )
}

describe("tallyCategory", () => {
  it("uses competition ranking", () => {
    expect(tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })).ranked.map(r => [r.nominee_id, r.rank])).toEqual([["A",1],["B",2],["C",2],["D",4],["E",5]])
  })
  it("picks nominees as ranks 1-3 including ties", () => {
    expect(tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })).nominee_ids).toEqual(["A","B","C"])
    expect(tallyCategory("c", v({ A: 5, B: 4, C: 3, D: 3, E: 1 })).nominee_ids).toEqual(["A","B","C","D"])
    expect(tallyCategory("c", v({ A: 6, B: 2, C: 2, D: 2, E: 1 })).nominee_ids).toEqual(["A","B","C","D"])
  })
  it("tied first uses only the tied nominees", () => {
    expect(tallyCategory("c", v({ A: 4, B: 4, C: 2 }))).toMatchObject({ first_tied: true, leader_ids: ["A","B"], nominee_ids: ["A","B"], top3_ids: ["A","B","C"] })
    expect(tallyCategory("c", v({ A: 3, B: 3, C: 3, D: 3 })).nominee_ids).toEqual(["A","B","C","D"])
  })
  it("handles no votes", () => {
    expect(tallyCategory("c", [])).toMatchObject({ ranked: [], nominee_ids: [], leader_ids: [], first_tied: false })
  })
  it("ranks eligible nominees with zero votes", () => {
    expect(tallyCategory("c", v({ B: 1 }), ["A","B"]).ranked).toEqual([{ nominee_id: "B", votes: 1, rank: 1 }, { nominee_id: "A", votes: 0, rank: 2 }])
    expect(tallyCategory("c", [], ["A","B"])).toMatchObject({ first_tied: true, leader_ids: ["A","B"] })
  })
  it("ignores other categories", () => {
    expect(tallyCategory("c", [...v({ A: 2 }), { category_id: "other", nominee_id: "B" }]).ranked).toHaveLength(1)
  })
  it("ignores votes for non-eligible nominees", () => {
    const t = tallyCategory("c", v({ A: 1, B: 1, Z: 5 }), ["A", "B"])
    expect(t.ranked.map(r => r.nominee_id)).toEqual(["A", "B"])
    expect(t.first_tied).toBe(true)
  })
})
