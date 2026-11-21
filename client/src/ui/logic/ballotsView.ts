import { ballotCardStatus, type BallotCardStatus, type BallotSummary } from "../../lib/voting"
import { closesInLabel, opensAtLabel } from "../../lib/time"
import type { Phase } from "../../lib/ballotFlow"
import type { PebbleName } from "../tokens"

export type BallotTab = "open" | "closed"

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

const statusOf = (b: BallotSummary, now: Date): BallotCardStatus => ballotCardStatus(b, b.category_count, b.my_vote_count, now)

// Members never see drafts. Open = running or not open yet (soonest-closing first, scheduled after); Closed = ended or released (newest first).
export function splitBallots(list: BallotSummary[], now: Date): { open: BallotSummary[]; closed: BallotSummary[] } {
    const visible = list.filter((b) => b.status !== "draft")
    const t = (iso: string) => new Date(iso).getTime()
    const running = visible.filter((b) => statusOf(b, now) === "open" || statusOf(b, now) === "voted").sort((a, c) => t(a.closes_at) - t(c.closes_at))
    const upcoming = visible.filter((b) => statusOf(b, now) === "upcoming").sort((a, c) => t(a.opens_at) - t(c.opens_at))
    const closed = visible.filter((b) => statusOf(b, now) === "closed").sort((a, c) => t(c.closes_at) - t(a.closes_at))
    return { open: [...running, ...upcoming], closed }
}

// Open by default; Closed only when nothing is open and there is something closed.
export const defaultTab = (openCount: number, closedCount: number): BallotTab => (openCount === 0 && closedCount > 0 ? "closed" : "open")

export const ballotTabs = (openCount: number, closedCount: number): { value: BallotTab; label: string }[] => [
    { value: "open", label: `Open ${openCount}` },
    { value: "closed", label: `Closed ${closedCount}` },
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
