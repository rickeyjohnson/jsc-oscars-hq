import { ballotCardStatus, type BallotCardStatus, type BallotSummary } from "../../lib/voting"
import { closesInLabel, opensAtLabel } from "../../lib/time"
import type { Phase } from "../../lib/ballotFlow"
import type { PebbleName } from "../tokens"

export type BallotTab = "open" | "voted" | "closed"

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

const statusOf = (b: BallotSummary, now: Date): BallotCardStatus => ballotCardStatus(b, b.category_count, b.my_vote_count, now)

// Members never see drafts. A ballot is in exactly one tab:
//   Open   = running with categories still to vote (soonest-closing first), then ballots not open yet
//   Voted  = running and voted in every category (still editable until it closes; soonest-closing first)
//   Closed = ended or released (newest first)
export function splitBallots(list: BallotSummary[], now: Date): { open: BallotSummary[]; voted: BallotSummary[]; closed: BallotSummary[] } {
    const visible = list.filter((b) => b.status !== "draft")
    const t = (iso: string) => new Date(iso).getTime()
    const byClose = (a: BallotSummary, c: BallotSummary) => t(a.closes_at) - t(c.closes_at)
    const running = visible.filter((b) => statusOf(b, now) === "open").sort(byClose)
    const upcoming = visible.filter((b) => statusOf(b, now) === "upcoming").sort((a, c) => t(a.opens_at) - t(c.opens_at))
    const voted = visible.filter((b) => statusOf(b, now) === "voted").sort(byClose)
    const closed = visible.filter((b) => statusOf(b, now) === "closed").sort((a, c) => t(c.closes_at) - t(a.closes_at))
    return { open: [...running, ...upcoming], voted, closed }
}

// Open if it has anything; else Voted; else Closed; else Open (its empty state).
export const defaultTab = (openCount: number, votedCount: number, closedCount: number): BallotTab =>
    openCount > 0 ? "open" : votedCount > 0 ? "voted" : closedCount > 0 ? "closed" : "open"

export const ballotTabs = (openCount: number, votedCount: number, closedCount: number): { value: BallotTab; label: string; muted: boolean }[] => [
    { value: "open", label: `Open ${openCount}`, muted: openCount === 0 },
    { value: "voted", label: `Voted ${votedCount}`, muted: votedCount === 0 },
    { value: "closed", label: `Closed ${closedCount}`, muted: closedCount === 0 },
]

/** The pill phase of a member's ballot: a voted ballot is still Open, an upcoming one is Scheduled. */
export function pillPhase(b: BallotSummary, now: Date): Phase {
    const s = statusOf(b, now)
    if (s === "upcoming") return "scheduled"
    if (s === "closed") return b.status === "released" ? "released" : "closed"
    return "open"
}

export function ballotSubtitle(b: BallotSummary, now: Date): string {
    const status = statusOf(b, now)
    const categories = plural(b.category_count, "category", "categories")
    if (status === "upcoming") return `${opensAtLabel(new Date(b.opens_at))} · ${categories}`
    if (status === "closed") return `Voting closed · ${categories}`
    if (status === "voted") return `All voted · ${closesInLabel(new Date(b.closes_at), now)}`
    return `${b.my_vote_count} of ${b.category_count} voted · ${closesInLabel(new Date(b.closes_at), now)}`
}

export type BallotPresentation = { status: BallotCardStatus; pebble: PebbleName | null; label: string; cta: string; to: string }

export function ballotPresentation(b: BallotSummary, now: Date): BallotPresentation {
    const status = statusOf(b, now)
    const to = `/app/ballots/${b.id}`
    switch (status) {
        case "open":
            return { status, pebble: "lime", label: "Open", cta: b.my_vote_count > 0 ? "Continue voting" : "Vote now", to }
        case "voted":
            return { status, pebble: "strawberry", label: "Open", cta: "Review votes", to }
        case "upcoming":
            return { status, pebble: "sky", label: "Scheduled", cta: "View", to }
        default:
            return b.status === "released"
                ? { status, pebble: null, label: "Released", cta: "View results", to: "/app/results" }
                : { status, pebble: null, label: "Closed", cta: "View", to }
    }
}

export const roundLabel = (round: BallotSummary["round"]): string | null => (round === "tiebreak" ? "Tiebreak" : round === "committee" ? "Committee" : null)

/** The soonest ballot that has not opened yet, or null. */
export function nextOpening(list: BallotSummary[], now: Date): BallotSummary | null {
    const upcoming = list.filter((b) => b.status !== "closed" && b.status !== "released" && new Date(b.opens_at).getTime() > now.getTime())
    upcoming.sort((a, b) => new Date(a.opens_at).getTime() - new Date(b.opens_at).getTime())
    return upcoming[0] ?? null
}

/** Plain-words explanation for a member who has no ballot to vote on. Includes the open time when one is scheduled. */
export function noBallotNote(list: BallotSummary[], now: Date): string {
    const next = nextOpening(list, now)
    if (next) return `${opensAtLabel(new Date(next.opens_at))}.`
    return "Voting opens when the committee publishes a ballot. It will show up here."
}
