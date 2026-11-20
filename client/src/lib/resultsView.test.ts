import { describe, expect, it } from "vitest"
import { buildResultCards, ordinal } from "./resultsView"
import type { Category, DecidedBy, Nominee, Place, ResultRow } from "../types"

const nom = (id: string, display_name: string, type: Nominee["type"] = "individual"): Nominee => ({ id, display_name, type, member_ids: [] })
const cat = (id: string, nominees: Nominee[]): Category => ({ id, name: id, description: "", order: 0, nominee_mode: "preset", allow_member_add: false, nominees })
const c1 = cat("c1", [nom("A", "Ann"), nom("B", "Bo"), nom("C", "Cy"), nom("D", "Di"), nom("E", "Ed")])
const c2 = cat("c2", [nom("A", "Ann")])
const duo = cat("duo", [nom("g1", "Nick, Rickey", "group"), nom("g2", "Kadin, Rico", "group")])
const row = (category_id: string, winner: string, decided_by: DecidedBy): ResultRow => ({
  category_id, decided_ballot_id: "b", winner_nominee_id: winner, nominee_ids: [winner], top3_nominee_ids: [winner], decided_by,
})
const p = (nominee_id: string, slot: 1 | 2 | 3 | null, place: number, tied: boolean): Place => ({ nominee_id, slot, place, tied })

describe("ordinal", () => {
  it("handles teens and suffixes", () => {
    expect(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st"]).toEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal))
  })
})

describe("buildResultCards", () => {
  it("builds podium and also-placed from places", () => {
    const [card] = buildResultCards([c1], { c1: { ...row("c1", "A", "votes"), places: [p("A", 1, 1, false), p("C", 2, 2, true), p("B", 3, 2, true), p("D", null, 4, false), p("E", null, 5, false)] } })
    expect(card.podium.map(e => [e.name, e.slot, e.tieLabel])).toEqual([["Cy", 2, "tied 2nd"], ["Ann", 1, null], ["Bo", 3, "tied 2nd"]])
    expect(card.also).toEqual([{ nominee_id: "D", name: "Di", placeLabel: "4th" }, { nominee_id: "E", name: "Ed", placeLabel: "5th" }])
    expect(card.note).toBeNull()
  })
  it("labels tied also-placed rows", () => {
    const [card] = buildResultCards([c1], { c1: { ...row("c1", "A", "votes"), places: [p("A", 1, 1, false), p("B", 2, 2, false), p("C", 3, 3, false), p("D", null, 4, true), p("E", null, 4, true)] } })
    expect(card.also.map(a => a.placeLabel)).toEqual(["tied 4th", "tied 4th"])
  })
  it("falls back to nominee order without places", () => {
    expect(buildResultCards([c1], { c1: { ...row("c1", "B", "tiebreak"), places: null, nominee_ids: ["A", "B"], top3_nominee_ids: ["A", "B", "C"] } })[0].podium.map(e => [e.name, e.slot, e.tieLabel]))
      .toEqual([["Ann", 2, null], ["Bo", 1, null], ["Cy", 3, null]])
  })
  it("renders only available slots", () => {
    expect(buildResultCards([c1], { c1: row("c1", "B", "votes") })[0].podium.map(e => e.slot)).toEqual([1])
  })
  it("notes by decided_by", () => {
    expect(buildResultCards([c1], { c1: row("c1", "B", "tiebreak") })[0].note).toBe("Winner decided by tiebreak")
    expect(buildResultCards([c1], { c1: row("c1", "B", "committee_vote") })[0].note).toBe("Winner decided by committee vote")
    expect(buildResultCards([c1], { c1: row("c1", "B", "manual") })[0].note).toBe("Winner picked by the committee")
  })
  it("marks categories without results pending and numbers them", () => {
    expect(buildResultCards([c1, c2], {})).toMatchObject([{ number: 1, pending: true, podium: [] }, { number: 2, pending: true }])
  })
  it("uses group display names and Unknown nominee fallback", () => {
    expect(buildResultCards([duo], { duo: { ...row("duo", "g1", "votes"), places: [p("g1", 1, 1, false), p("g2", 2, 2, false)] } })[0].podium.map(e => e.name)).toEqual(["Kadin, Rico", "Nick, Rickey"])
    expect(buildResultCards([c2], { c2: row("c2", "ZZ", "votes") })[0].podium[0].name).toBe("Unknown nominee")
  })
  it("never includes vote counts", () => {
    expect(JSON.stringify(buildResultCards([c1], { c1: row("c1", "A", "votes") }))).not.toContain("votes\"")
  })
})
