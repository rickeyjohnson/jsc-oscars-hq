import { describe, expect, it } from "vitest"
import { releaseChecks } from "./release"
import { failingLines, firstFailingBallotId, winnerCount } from "./releaseView"
import type { Ballot } from "../types"

const NOW = new Date("2026-12-01T12:00:00Z")
const b = (o: Partial<Ballot>): Ballot => ({ id: "m", season_id: "S", parent_ballot_id: null, name: "B", round: "main", status: "closed", opens_at: "2026-11-01T00:00:00Z", closes_at: "2026-11-02T00:00:00Z", ...o })
const st = (ballots: Ballot[], results: Record<string, { winner_nominee_id: string | null }> = {}, cats = ["c1"]) => ({ ballots, mainCategoryIds: cats, results: results as never })

describe("releaseView", () => {
    it("points at the main ballot still open", () => {
        const s = st([b({ id: "m1" }), b({ id: "m2", status: "open", closes_at: "2027-01-01T00:00:00Z", opens_at: "2026-11-05T00:00:00Z" })], { c1: { winner_nominee_id: "n" } })
        const { checks } = releaseChecks(s, NOW)
        expect(firstFailingBallotId(s, checks, NOW)).toBe("m2")
        expect(failingLines(checks)).toEqual(["1 of 2 ballots closed"])
    })
    it("an open round points at its main ballot; a missing winner at the first main ballot", () => {
        const round = b({ id: "t1", round: "tiebreak", parent_ballot_id: "m1", status: "open", closes_at: "2027-01-01T00:00:00Z", opens_at: "2026-11-06T00:00:00Z" })
        const s = st([b({ id: "m1" }), round], { c1: { winner_nominee_id: "n" } })
        expect(firstFailingBallotId(s, releaseChecks(s, NOW).checks, NOW)).toBe("m1")
        const s2 = st([b({ id: "m1" })])
        expect(firstFailingBallotId(s2, releaseChecks(s2, NOW).checks, NOW)).toBe("m1")
    })
    it("counts winners", () => {
        expect(winnerCount(st([], { c1: { winner_nominee_id: "n" }, c2: { winner_nominee_id: null } }, ["c1", "c2", "c3"]))).toBe(1)
    })
})
