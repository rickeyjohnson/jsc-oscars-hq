import { ballotCardStatus, type BallotCardStatus, type BallotSummary } from "../../lib/voting"
import { closesInLabel, opensAtLabel } from "../../lib/time"
import type { ChipTone } from "./variants"
import type { PebbleName } from "../tokens"

export type BallotFilter = "all" | "open" | "voted" | "closed"

export const BALLOT_FILTERS: { value: BallotFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "voted", label: "Voted" },
    { value: "closed", label: "Closed" },
]

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

const statusOf = (b: BallotSummary, now: Date): BallotCardStatus => ballotCardStatus(b, b.category_count, b.my_vote_count, now)

export function filterBallots(list: BallotSummary[], f: BallotFilter, now: Date): BallotSummary[] {
    if (f === "all") return list
    return list.filter((b) => {
        const s = statusOf(b, now)
        return f === "open" ? s === "open" || s === "upcoming" : s === f
    })
}

export function ballotSubtitle(b: BallotSummary, now: Date): string {
    const status = statusOf(b, now)
    const categories = plural(b.category_count, "category", "categories")
    if (status === "upcoming") return `${opensAtLabel(new Date(b.opens_at))} · ${categories}`
    if (status === "closed") return `Voting closed · ${categories}`
    return `${b.my_vote_count} of ${b.category_count} voted · ${closesInLabel(new Date(b.closes_at), now)}`
}

export function emptyFilterText(f: BallotFilter): string {
    switch (f) {
        case "open":
            return "No open ballots right now. Check back when the committee publishes one."
        case "voted":
            return "You haven't finished voting on any ballot yet."
        case "closed":
            return "No closed ballots yet."
        default:
            return "No ballots yet. Check back when the committee publishes one."
    }
}

export type BallotPresentation = { status: BallotCardStatus; pebble: PebbleName | null; label: string; chipTone: ChipTone; cta: string; to: string }

export function ballotPresentation(b: BallotSummary, now: Date): BallotPresentation {
    const status = statusOf(b, now)
    const to = `/app/ballots/${b.id}`
    switch (status) {
        case "open":
            return { status, pebble: "lime", label: "Open", chipTone: "neutral", cta: b.my_vote_count > 0 ? "Continue voting" : "Vote now", to }
        case "voted":
            return { status, pebble: "strawberry", label: "Voted", chipTone: "neutral", cta: "Review votes", to }
        case "upcoming":
            return { status, pebble: "sky", label: "Upcoming", chipTone: "neutral", cta: "View", to }
        default:
            return b.status === "released"
                ? { status, pebble: null, label: "Released", chipTone: "lemon", cta: "View results", to: "/app/results" }
                : { status, pebble: null, label: "Closed", chipTone: "neutral", cta: "View", to }
    }
}

export const roundLabel = (round: BallotSummary["round"]): string | null => (round === "tiebreak" ? "Tiebreak" : round === "committee" ? "Committee" : null)
