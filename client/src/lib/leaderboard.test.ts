import { describe, expect, it } from "vitest"
import type { Category, Member, Nominee, ResultRow } from "../types"
import { leaderboard, myCategories } from "./leaderboard"

const members: Member[] = ["Anthony", "Evan", "Micah", "Nick", "Rico"].map(name => ({ id: `m-${name}`, name, user_id: null }))
const nom = (id: string, display_name: string, member_ids: string[]): Nominee => ({ id, display_name, type: member_ids.length > 1 ? "group" : "person", member_ids })
const cat = (id: string, name: string, nominees: Nominee[]): Category => ({ id, name, description: "", order: 0, nominee_mode: "preset", allow_member_add: false, nominees })
const r = (category_id: string, winner: string | null, nominee_ids: string[]): ResultRow => ({ category_id, decided_ballot_id: "M", winner_nominee_id: winner, nominee_ids, top3_nominee_ids: [], decided_by: "votes" })

const locs = cat("locs", "Best Locs", [nom("n-rico", "Rico", ["m-Rico"]), nom("n-nick", "Nick", ["m-Nick"])])
const duo = cat("duo", "Best Duo", [nom("g-nick-rico", "Nick & Rico", ["m-Nick", "m-Rico"]), nom("g-evan-tj", "Evan & TJ", ["m-Evan"])])
const car = cat("car", "Best Car", [nom("n-nick", "Nick", ["m-Nick"]), nom("n-rico", "Rico", ["m-Rico"])])

describe("leaderboard", () => {
  it("ranks with competition ties and name order", () => {
    const rows = leaderboard({ "m-Micah": { wins: 2, noms: 3 }, "m-Nick": { wins: 2, noms: 2 }, "m-Rico": { wins: 1, noms: 4 }, "m-Evan": { wins: 0, noms: 1 } }, members)
    expect(rows.map(x => [x.name, x.rank, x.tied, x.rate])).toEqual([["Nick", 1, true, 100], ["Micah", 1, true, 67], ["Rico", 3, false, 25], ["Anthony", 4, true, 0], ["Evan", 4, true, 0]])
  })
  it("ties at the podium boundary share a rank", () => {
    const rows = leaderboard({ "m-Anthony": { wins: 5, noms: 5 }, "m-Evan": { wins: 4, noms: 5 }, "m-Micah": { wins: 3, noms: 4 }, "m-Nick": { wins: 3, noms: 6 }, "m-Rico": { wins: 2, noms: 2 } }, members)
    expect(rows.map(r => [r.name, r.rank, r.tied])).toEqual([["Anthony", 1, false], ["Evan", 2, false], ["Micah", 3, true], ["Nick", 3, true], ["Rico", 5, false]])
  })
  it("includes every member with no stats", () => {
    const rows = leaderboard({}, members)
    expect(rows).toHaveLength(5)
    expect(rows.every(x => x.rank === 1 && x.tied && x.rate === 0)).toBe(true)
  })
})

describe("myCategories", () => {
  it("splits won and nominated-only in category order", () => {
    const mine = myCategories([locs, duo, car], { locs: r("locs", "n-rico", ["n-rico", "n-nick"]), duo: r("duo", "g-nick-rico", ["g-nick-rico", "g-evan-tj"]), car: r("car", "n-nick", ["n-nick", "n-rico"]) }, "m-Rico", members)
    expect(mine.won.map(c => c.label)).toEqual(["Best Locs", "Best Duo (with Nick)"])
    expect(mine.nominatedOnly.map(c => c.label)).toEqual(["Best Car"])
  })
  it("is empty without results or when not nominated", () => {
    expect(myCategories([locs], {}, "m-Rico", members)).toEqual({ won: [], nominatedOnly: [] })
    expect(myCategories([duo], { duo: r("duo", "g-nick-rico", ["g-nick-rico"]) }, "m-Micah", members)).toEqual({ won: [], nominatedOnly: [] })
  })
  it("a member nominated alone and in the winning group counts one win", () => {
    const c = cat("x", "Best X", [nom("n-rico", "Rico", ["m-Rico"]), nom("g-nick-rico", "Nick & Rico", ["m-Nick", "m-Rico"])])
    const mine = myCategories([c], { x: r("x", "g-nick-rico", ["n-rico", "g-nick-rico"]) }, "m-Rico", members)
    expect(mine.won.map(x => x.label)).toEqual(["Best X (with Nick)"])
    expect(mine.nominatedOnly).toEqual([])
  })
  it("counts a winner outside nominee_ids", () => {
    expect(myCategories([locs], { locs: r("locs", "n-rico", []) }, "m-Rico", members).won.map(c => c.label)).toEqual(["Best Locs"])
  })
})
