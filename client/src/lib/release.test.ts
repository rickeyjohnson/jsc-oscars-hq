import { describe, expect, it } from "vitest"
import type { Ballot, BallotRound, BallotStatus, ResultRow, Season } from "../types"
import { releaseChecks, runRelease, type ReleaseIO, type ReleaseStatus } from "./release"

const now = new Date("2026-12-04T19:00:00Z")
const b = (id: string, round: BallotRound, status: BallotStatus, closes: string): Ballot => ({
  id, season_id: "S", parent_ballot_id: round === "main" ? null : "M", name: id, round, status, opens_at: "2026-11-01T00:00:00Z", closes_at: closes,
})
const res = (id: string, winner: string | null): ResultRow => ({
  category_id: id, decided_ballot_id: "M", winner_nominee_id: winner, nominee_ids: [], top3_nominee_ids: [], decided_by: winner ? "votes" : null,
})
const M = b("M", "main", "closed", "2026-12-03T00:00:00Z"), D = b("D", "main", "draft", "2026-12-09T00:00:00Z")
const T = b("T", "tiebreak", "open", "2026-12-05T00:00:00Z")
const season: Season = { id: "S", name: "2026", ceremony_at: null, location: null, results_released_at: null }

describe("releaseChecks", () => {
  it("reports open rounds and missing winners, ignoring drafts", () => {
    expect(releaseChecks({ ballots: [M, D, T], mainCategoryIds: ["c1", "c2"], results: { c1: res("c1", "A"), c2: res("c2", null) } }, now)).toEqual({
      ready: false,
      checks: [
        { id: "ballots_closed", ok: true, label: "1 of 1 ballots closed" },
        { id: "no_round_open", ok: false, label: "1 tiebreak/committee round(s) still open" },
        { id: "winners", ok: false, label: "1 of 2 categories have a winner" },
      ],
    })
  })
  it("counts an open ballot whose window ended as closed", () => {
    const T2 = { ...T, closes_at: "2026-12-04T18:00:00Z" }
    const r = releaseChecks({ ballots: [M, T2], mainCategoryIds: ["c1", "c2"], results: { c1: res("c1", "A"), c2: res("c2", "B") } }, now)
    expect(r.ready).toBe(true)
    expect(r.checks[1]).toEqual({ id: "no_round_open", ok: true, label: "No tiebreak or committee round open" })
  })
  it("an open main ballot still in its window is not closed", () => {
    const O = b("O", "main", "open", "2026-12-05T00:00:00Z")
    expect(releaseChecks({ ballots: [M, O], mainCategoryIds: ["c1"], results: { c1: res("c1", "A") } }, now).checks[0]).toEqual({ id: "ballots_closed", ok: false, label: "1 of 2 ballots closed" })
  })
  it("nothing to release is not ready", () => {
    expect(releaseChecks({ ballots: [], mainCategoryIds: [], results: {} }, now).checks.map((c) => c.ok)).toEqual([false, true, false])
  })
})

type Opts = { marked?: boolean; ballotsFail?: boolean }
const fakeIO = (status: ReleaseStatus, calls: string[], opts: Opts = {}): ReleaseIO => ({
  async load() { calls.push("load"); return status },
  async releaseBallots() { calls.push("releaseBallots"); if (opts.ballotsFail) throw new Error("ballots failed") },
  async markSeasonReleased() { calls.push("markSeasonReleased"); return opts.marked ?? true },
})
const readyStatus: ReleaseStatus = { season, ballots: [M, D], mainCategoryIds: ["c1", "c2"], results: { c1: res("c1", "A"), c2: res("c2", "B") } }
const notReady: ReleaseStatus = { season, ballots: [M, D, T], mainCategoryIds: ["c1", "c2"], results: { c1: res("c1", "A"), c2: res("c2", null) } }

describe("runRelease", () => {
  it("releases ballots first and the season last", async () => {
    const calls: string[] = []
    await runRelease(fakeIO(readyStatus, calls), "S", now)
    expect(calls).toEqual(["load", "releaseBallots", "markSeasonReleased"])
  })
  it("writes nothing when a check fails", async () => {
    const calls: string[] = []
    await expect(runRelease(fakeIO(notReady, calls), "S", now)).rejects.toThrow("Not ready to release: 1 tiebreak/committee round(s) still open; 1 of 2 categories have a winner")
    expect(calls).toEqual(["load"])
  })
  it("refuses a season already released", async () => {
    const calls: string[] = []
    await expect(runRelease(fakeIO({ ...readyStatus, season: { ...season, results_released_at: "2026-12-04T20:00:00Z" } }, calls), "S", now)).rejects.toThrow("Results are already released")
    expect(calls).toEqual(["load"])
  })
  it("surfaces a season update that saved no row", async () => {
    const calls: string[] = []
    await expect(runRelease(fakeIO(readyStatus, calls, { marked: false }), "S", now)).rejects.toThrow("Release did not save. Check you are signed in as committee.")
  })
  it("does not mark the season when releasing ballots fails", async () => {
    const calls: string[] = []
    await expect(runRelease(fakeIO(readyStatus, calls, { ballotsFail: true }), "S", now)).rejects.toThrow()
    expect(calls).not.toContain("markSeasonReleased")
  })
})
