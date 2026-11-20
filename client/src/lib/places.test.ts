import { describe, expect, it } from "vitest"
import { tallyCategory as rawTally } from "./tally"
import { attachPlaces, backfillPlaces, computePlaces, displayPlaces, seededOrder } from "./places"
import type { Place } from "../types"

function v(counts: Record<string, number>, category = "c") {
  return Object.entries(counts).flatMap(([nominee_id, n]) =>
    Array.from({ length: n }, () => ({ category_id: category, nominee_id })),
  )
}
// v() tags votes with category "c"; retag so they count for whichever category is tallied
const tallyCategory = (cat: string, votes: { category_id: string; nominee_id: string }[], elig?: string[]) =>
  rawTally(cat, votes.map(x => ({ ...x, category_id: cat })), elig)
const p = (nominee_id: string, slot: 1 | 2 | 3 | null, place: number, tied: boolean): Place => ({ nominee_id, slot, place, tied })

describe("seededOrder", () => {
  it("is deterministic and input-order independent", () => {
    expect(seededOrder(["A","B","C","D"], "c1")).toEqual(["C","B","D","A"])
    expect(seededOrder(["A","B","C","D"], "c2")).toEqual(["D","B","C","A"])
    expect(seededOrder(["D","C","B","A"], "c1")).toEqual(["C","B","D","A"])
    expect(seededOrder([], "c1")).toEqual([])
  })
})

describe("computePlaces", () => {
  it("orders by votes with tied flags", () => {
    expect(computePlaces(tallyCategory("c1", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })), { winnerId: "A" }, "c1"))
      .toEqual([p("A",1,1,false), p("C",2,2,true), p("B",3,2,true), p("D",null,4,false), p("E",null,5,false)])
    expect(computePlaces(tallyCategory("c2", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })), { winnerId: "A" }, "c2").map(x => x.nominee_id)).toEqual(["A","B","C","D","E"])
  })
  it("handles tiebreak, committee, manual, unresolved", () => {
    expect(computePlaces(tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), { winnerId: "B", roundTally: tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]) }, "c2"))
      .toEqual([p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)])
    expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 4, D: 2 })), { winnerId: "C", roundTally: tallyCategory("c1", v({ C: 2 }), ["B","C"]) }, "c1"))
      .toEqual([p("C",1,1,false), p("B",2,2,false), p("A",3,3,false), p("D",null,4,false)])
    expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 4, D: 2 })), { winnerId: "B" }, "c1"))
      .toEqual([p("B",1,1,false), p("C",2,2,true), p("A",3,2,true), p("D",null,4,false)])
    expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 2 })), { winnerId: null }, "c1"))
      .toEqual([p("B",1,1,true), p("A",2,1,true), p("C",3,3,false)])
    expect(computePlaces(tallyCategory("c1", []), { winnerId: "Z" }, "c1")).toEqual([p("Z",1,1,false)])
  })
  it("outputs exactly four keys", () => {
    for (const x of computePlaces(tallyCategory("c1", v({ A: 2, B: 1 })), { winnerId: "A" }, "c1")) expect(Object.keys(x).sort()).toEqual(["nominee_id","place","slot","tied"])
  })
})

describe("row helpers", () => {
  const row = { category_id: "c2", decided_ballot_id: "T", winner_nominee_id: "B", nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: "tiebreak" as const }
  it("attachPlaces", () => {
    expect(attachPlaces(row, tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]))).toEqual({ ...row, places: [p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)] })
  })
  it("backfillPlaces", () => {
    expect(backfillPlaces([{ ...row, places: null }, { ...row, category_id: "c3", places: [p("X",1,1,false)] }, { ...row, category_id: "c9", places: null }],
      { c2: tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), c3: tallyCategory("c3", v({ X: 1 })) },
      { c2: tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]) }).map(r => [r.category_id, r.places.map(x => x.nominee_id)]))
      .toEqual([["c2", ["B","A","C"]]])
  })
  it("displayPlaces", () => {
    expect(displayPlaces({ ...row, places: null })).toEqual([p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)])
    expect(displayPlaces({ ...row, places: [p("X",1,1,false)] })).toEqual([p("X",1,1,false)])
  })
})
