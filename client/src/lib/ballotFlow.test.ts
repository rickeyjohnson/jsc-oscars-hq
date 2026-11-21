import { describe, expect, it } from "vitest"
import { groupBallots, leftNames, nextCard, orderVoters, phaseOf, stepperSteps, votedSummary, type NextInput } from "./ballotFlow"
import type { BallotSummary } from "./voting"

const NOW = new Date("2026-12-01T12:00:00Z")
const H = 3_600_000
const bs = (o: Partial<BallotSummary>): BallotSummary => ({ id: "b", season_id: "S", parent_ballot_id: null, name: "B", round: "main", status: "open", opens_at: new Date(NOW.getTime() - 5 * H).toISOString(), closes_at: new Date(NOW.getTime() + 5 * H).toISOString(), category_count: 1, my_vote_count: 0, ...o })

describe("phaseOf", () => {
    it("maps status and times", () => {
        expect(phaseOf(bs({}), NOW)).toBe("open")
        expect(phaseOf(bs({ opens_at: new Date(NOW.getTime() + H).toISOString() }), NOW)).toBe("scheduled")
        expect(phaseOf(bs({ closes_at: new Date(NOW.getTime() - H).toISOString() }), NOW)).toBe("closed")
        expect(phaseOf(bs({ status: "draft" }), NOW)).toBe("draft")
        expect(phaseOf(bs({ status: "released" }), NOW)).toBe("released")
    })
})

describe("groupBallots", () => {
    it("groups in order, nests rounds under their main, hides empty groups", () => {
        const g = groupBallots(
            [bs({ id: "r", status: "released" }), bs({ id: "m", status: "closed" }), bs({ id: "t", status: "open", round: "tiebreak", parent_ballot_id: "m" }), bs({ id: "d", status: "draft" }), bs({ id: "o" })],
            NOW,
        )
        expect(g.map((x) => x.key)).toEqual(["needs", "open", "drafts", "finished"])
        expect(g[0].items[0].children.map((c) => c.id)).toEqual(["t"])
        expect(g.flatMap((x) => x.items).map((i) => i.ballot.id)).not.toContain("t")
        expect(g[0].items[0].hint).toBe("check the rounds")
    })
    it("an orphan round stands alone", () => {
        expect(groupBallots([bs({ id: "t", round: "tiebreak", parent_ballot_id: "gone", status: "closed" })], NOW)[0].items).toHaveLength(1)
    })
})

describe("stepperSteps", () => {
    it("tiebreak is dashed (skip) when no tie exists", () => {
        const s = stepperSteps({ phase: "closed", hasTiebreak: false, tiesNeeded: false, allDecided: false })
        expect(s[3].state).toBe("skip")
        expect(s[2].state).toBe("cur")
    })
    it("ties make the tiebreak step current", () => {
        const s = stepperSteps({ phase: "closed", hasTiebreak: false, tiesNeeded: true, allDecided: false })
        expect(s[3].state).toBe("cur")
        expect(s[2].state).toBe("done")
    })
    it("decided and released", () => {
        expect(stepperSteps({ phase: "closed", hasTiebreak: true, tiesNeeded: false, allDecided: true })[4].state).toBe("cur")
        expect(stepperSteps({ phase: "released", hasTiebreak: false, tiesNeeded: false, allDecided: true })[5].state).toBe("cur")
    })
})

describe("who voted", () => {
    const rows = [
        { name: "Dee", voted: 0, total: 4, claimed: true },
        { name: "Ava", voted: 4, total: 4, claimed: true },
        { name: "Cam", voted: 2, total: 4, claimed: true },
        { name: "Lou", voted: 0, total: 4, claimed: false },
    ]
    it("summary, order and names of who is left", () => {
        expect(votedSummary(rows)).toEqual({ claimed: 3, finished: 1, left: 2, unclaimed: 1 })
        expect(orderVoters(rows).map((r) => r.name)).toEqual(["Dee", "Cam", "Ava", "Lou"])
        expect(leftNames(rows)).toEqual(["Cam", "Dee"])
    })
})

describe("nextCard: exactly one primary", () => {
    const base: NextInput = { phase: "closed", round: "main", opensLabel: "Nov 25", closesLabel: "Nov 29", blockers: [], finished: 7, claimed: 13, left: 6, recording: false, recordError: false, categoryCount: 36, decided: 33, toEnter: 0, tied: 0, nextRound: null, roundRunning: false, allDecided: false }
    it("draft: publish, disabled while blockers remain", () => {
        expect(nextCard({ ...base, phase: "draft", blockers: ["x"] }).primary).toEqual({ id: "publish", label: "Publish ballot", disabled: true })
    })
    it("open: see who's left, none when everyone finished", () => {
        expect(nextCard({ ...base, phase: "open" }).primary?.id).toBe("see-left")
        expect(nextCard({ ...base, phase: "open", left: 0 }).primary).toBeNull()
    })
    it("closed: recording, error, ties, committee entry, reveal", () => {
        expect(nextCard({ ...base, recording: true }).primary).toBeNull()
        expect(nextCard({ ...base, recordError: true }).primary?.id).toBe("retry-record")
        expect(nextCard({ ...base, tied: 3, nextRound: "tiebreak" }).primary?.label).toBe("Start tiebreak")
        expect(nextCard({ ...base, tied: 1, nextRound: "committee" }).primary?.label).toBe("Start committee round")
        const c = nextCard({ ...base, round: "committee", toEnter: 1, categoryCount: 2, decided: 1 })
        expect(c.heading).toBe("1 of 2 categories decided")
        expect(c.primary?.id).toBe("enter-winner")
        expect(nextCard({ ...base, allDecided: true }).primary?.id).toBe("reveal")
    })
    it("released: view as members", () => {
        expect(nextCard({ ...base, phase: "released" }).primary?.id).toBe("view-results")
    })
})
