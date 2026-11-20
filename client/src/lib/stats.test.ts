import { describe, expect, it } from "vitest"
import type { Nominee, ResultRow } from "../types"
import { nomineeStats } from "./stats"

const n = (id: string, display_name: string, type: Nominee["type"], member_ids: string[]): Nominee => ({ id, display_name, type, member_ids })
const noms: Record<string, Nominee> = {
  g1: n("g1", "G1", "group", ["a", "b"]),
  g2: n("g2", "G2", "group", ["a", "c"]),
  carrie: n("carrie", "Carrie", "outsider", []),
  p: n("p", "Pat", "person", ["a"]),
}
const r = (category_id: string): ResultRow => ({ category_id, decided_ballot_id: "M", winner_nominee_id: null, nominee_ids: [], top3_nominee_ids: [], decided_by: "votes" })

describe("nomineeStats", () => {
  it("counts a group member once per category", () => {
    expect(nomineeStats([{ ...r("x"), nominee_ids: ["g1","g2"], winner_nominee_id: "g1" }], noms).members).toEqual({ a: { wins: 1, noms: 1 }, b: { wins: 1, noms: 1 }, c: { wins: 0, noms: 1 } })
  })
  it("keys others by display name", () => {
    expect(nomineeStats([{ ...r("x"), nominee_ids: ["carrie"], winner_nominee_id: "carrie" }], noms).others).toEqual({ Carrie: { wins: 1, noms: 1 } })
  })
  it("accumulates across categories", () => {
    expect(nomineeStats([{ ...r("x"), nominee_ids: ["p"], winner_nominee_id: null }, { ...r("y"), nominee_ids: ["p"], winner_nominee_id: "p" }], noms).members.a).toEqual({ wins: 1, noms: 2 })
  })
})
