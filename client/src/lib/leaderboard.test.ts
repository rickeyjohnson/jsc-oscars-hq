import { describe, expect, it } from "vitest"
import type { Member } from "../types"
import { leaderboard } from "./leaderboard"

const members: Member[] = ["Anthony", "Evan", "Micah", "Nick", "Rico"].map(name => ({ id: `m-${name}`, name, user_id: null }))


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
