import type { Ballot } from "../types"
import { hasEnded } from "./release"

export const REOPEN_UNAVAILABLE = "Reopening isn't available yet. The database update for it hasn't been applied."
export const REOPEN_FAILED = "Couldn't reopen the ballot. Check your connection and try again."

// The database function's own refusal messages are written for the committee, so they are shown as-is.
const REFUSALS = [
    /already released/i,
    /tiebreak or committee rounds/i,
    /must be in the future/i,
    /must be after the ballot opens/i,
    /only a closed ballot/i,
    /ballot not found/i,
    /only committee members/i,
]

export type ReopenErrorKind = "unavailable" | "refused" | "other"

// PGRST202 / 42883: the function is not in the database (migration not pasted yet).
export function classifyReopenError(e: unknown): ReopenErrorKind {
    const err = e as { code?: string; message?: string } | null
    const msg = String(err?.message ?? "")
    if (err?.code === "PGRST202" || err?.code === "42883" || /could not find the function|schema cache|does not exist/i.test(msg)) return "unavailable"
    if (REFUSALS.some((r) => r.test(msg))) return "refused"
    return "other"
}

export function reopenMessage(e: unknown): string {
    const kind = classifyReopenError(e)
    if (kind === "unavailable") return REOPEN_UNAVAILABLE
    if (kind === "refused") return String((e as { message?: string }).message)
    return REOPEN_FAILED
}

// Matches the database rules the client can see: closed (or window over), not released, no child rounds.
export function canReopen(b: Pick<Ballot, "status" | "closes_at" | "opens_at" | "round" | "parent_ballot_id">, hasChildRounds: boolean, seasonReleased: boolean, now: Date): boolean {
    if (seasonReleased || b.status === "released" || b.status === "draft" || hasChildRounds) return false
    return b.status === "closed" || (b.status === "open" && hasEnded({ ...b, id: "", season_id: "", name: "" } as Ballot, now))
}

const pad = (n: number) => String(n).padStart(2, "0")
// datetime-local value for `now` plus `hours` (default one day), in local time.
export const localDateTimeInput = (now: Date, hours = 24): string => {
    const d = new Date(now.getTime() + hours * 3_600_000)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// null when fine, else why the picked close time cannot be used.
export const closeTimeProblem = (local: string, now: Date): string | null => {
    if (!local) return "Pick when voting closes"
    const t = new Date(local).getTime()
    if (Number.isNaN(t)) return "Pick when voting closes"
    return t <= now.getTime() ? "Pick a close time in the future" : null
}
