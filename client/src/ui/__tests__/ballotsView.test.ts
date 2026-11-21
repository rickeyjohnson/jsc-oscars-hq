import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ballotPresentation, ballotSubtitle, ballotTabs, defaultTab, pillPhase, plural, splitBallots } from "../logic/ballotsView"
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
    it("splits into Open (soonest closing first, scheduled last) and Closed (newest first); drafts never show", () => {
        const later = mk("later", { closes_at: new Date(now.getTime() + 9 * DAY).toISOString() })
        const soon = mk("soon", { closes_at: new Date(now.getTime() + DAY).toISOString() })
        const old = mk("old", { status: "closed", closes_at: new Date(now.getTime() - 5 * DAY).toISOString() })
        const draft = mk("draft", { status: "draft" })
        const s = splitBallots([later, upcoming, closed, old, soon, voted, draft], now)
        expect(s.open.map((b) => b.id)).toEqual(["soon", "voted", "later", "upcoming"])
        expect(s.closed.map((b) => b.id)).toEqual(["closed", "old"])
        expect([...s.open, ...s.closed].some((b) => b.id === "draft")).toBe(false)
    })
    it("tabs carry counts and default to Open unless only Closed has something", () => {
        expect(ballotTabs(2, 1).map((t) => t.label)).toEqual(["Open 2", "Closed 1"])
        expect(defaultTab(2, 1)).toBe("open")
        expect(defaultTab(0, 3)).toBe("closed")
        expect(defaultTab(0, 0)).toBe("open")
    })
    it("pill phase: a voted ballot is still Open, upcoming is Scheduled, closed vs released", () => {
        expect(pillPhase(voted, now)).toBe("open")
        expect(pillPhase(upcoming, now)).toBe("scheduled")
        expect(pillPhase(closed, now)).toBe("closed")
        expect(pillPhase({ ...closed, status: "released" }, now)).toBe("released")
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
        expect(ballotPresentation(voted, now)).toMatchObject({ pebble: "strawberry", label: "Open", cta: "Review votes" })
        expect(ballotPresentation(upcoming, now)).toMatchObject({ pebble: "sky", label: "Scheduled", cta: "View" })
        expect(ballotPresentation(closed, now)).toMatchObject({ pebble: null, label: "Closed", cta: "View", to: "/app/ballots/closed" })
        const rel = ballotPresentation({ ...closed, status: "released" }, now)
        expect(rel).toMatchObject({ pebble: null, label: "Released", cta: "View results", to: "/app/results" })
    })
    it("BallotCard has no legacy copy", () => {
        const src = readFileSync(join(__dirname, "..", "..", "components", "BallotCard.tsx"), "utf8")
        expect(src).not.toMatch(/categorie\(s\)|uppercase|toUpperCase/)
    })
})
