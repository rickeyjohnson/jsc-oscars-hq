import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ballotPresentation, ballotSubtitle, emptyFilterText, filterBallots, plural } from "../logic/ballotsView"
import type { BallotSummary } from "../../lib/voting"

const now = new Date("2026-11-27T12:00:00Z")
const DAY = 86_400_000
const mk = (id: string, o: Partial<BallotSummary> = {}): BallotSummary => ({
    id,
    season_id: "S",
    parent_ballot_id: null,
    name: id,
    round: "main",
    status: "open",
    opens_at: new Date(now.getTime() - DAY).toISOString(),
    closes_at: new Date(now.getTime() + 3 * DAY).toISOString(),
    category_count: 30,
    my_vote_count: 7,
    ...o,
})
const open = mk("open")
const voted = mk("voted", { my_vote_count: 30 })
const closed = mk("closed", { status: "closed" })
const upcoming = mk("upcoming", { opens_at: new Date(now.getTime() + DAY).toISOString() })

describe("ballotsView", () => {
    it("filters", () => {
        const all = [open, voted, closed, upcoming]
        expect(filterBallots(all, "all", now)).toHaveLength(4)
        expect(filterBallots(all, "open", now).map((b) => b.id)).toEqual(["open", "upcoming"])
        expect(filterBallots(all, "voted", now).map((b) => b.id)).toEqual(["voted"])
        expect(filterBallots(all, "closed", now).map((b) => b.id)).toEqual(["closed"])
    })
    it("subtitles", () => {
        expect(ballotSubtitle(open, now)).toBe("7 of 30 voted · Closes in 3 days")
        expect(ballotSubtitle({ ...open, category_count: 1, my_vote_count: 0 }, now)).toContain("0 of 1 voted")
        expect(ballotSubtitle(closed, now)).toBe("Voting closed · 30 categories")
        expect(ballotSubtitle({ ...closed, category_count: 1 }, now)).toBe("Voting closed · 1 category")
        expect(ballotSubtitle(upcoming, now)).toMatch(/^Voting opens .* · 30 categories$/)
    })
    it("pluralizes", () => {
        expect(plural(1, "category", "categories")).toBe("1 category")
        expect(plural(4, "category", "categories")).toBe("4 categories")
        expect(plural(0, "category", "categories")).toBe("0 categories")
    })
    it("maps status to pebble, label and cta", () => {
        expect(ballotPresentation(open, now)).toMatchObject({ pebble: "lime", label: "Open", cta: "Continue voting" })
        expect(ballotPresentation({ ...open, my_vote_count: 0 }, now).cta).toBe("Vote now")
        expect(ballotPresentation(voted, now)).toMatchObject({ pebble: "strawberry", label: "Voted", cta: "Review votes" })
        expect(ballotPresentation(upcoming, now)).toMatchObject({ pebble: "sky", label: "Upcoming", cta: "View" })
        expect(ballotPresentation(closed, now)).toMatchObject({ pebble: null, label: "Closed", cta: "View", to: "/app/ballots/closed" })
        const rel = ballotPresentation({ ...closed, status: "released" }, now)
        expect(rel).toMatchObject({ pebble: null, label: "Released", chipTone: "lemon", cta: "View results", to: "/app/results" })
    })
    it("filter empty copy", () => {
        expect(emptyFilterText("closed")).toBe("No closed ballots yet.")
        expect(emptyFilterText("open")).toBe("No open ballots right now. Check back when the committee publishes one.")
    })
    it("BallotCard has no legacy copy", () => {
        const src = readFileSync(join(__dirname, "..", "..", "components", "BallotCard.tsx"), "utf8")
        expect(src).not.toMatch(/categorie\(s\)|uppercase|toUpperCase/)
    })
})
