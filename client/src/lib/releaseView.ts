import { hasEnded, type ReleaseCheck, type ReleaseStatus } from "./release"

// Presentation helpers for the reveal page. The gate rules themselves live in release.ts.

const byOpens = (a: { opens_at: string }, b: { opens_at: string }) => a.opens_at.localeCompare(b.opens_at)

// The ballot to open from "Go to tally": the first one that fails a check (a main ballot still open, else a
// round still open), else the first live main ballot (a category lacks a winner), else null.
export function firstFailingBallotId(s: Omit<ReleaseStatus, "season">, checks: ReleaseCheck[], now: Date): string | null {
    const failing = new Set(checks.filter((c) => !c.ok).map((c) => c.id))
    const live = s.ballots.filter((b) => b.status !== "draft").sort(byOpens)
    const main = live.filter((b) => b.round === "main")
    if (failing.has("ballots_closed")) {
        const b = main.find((x) => !hasEnded(x, now))
        if (b) return b.id
    }
    if (failing.has("no_round_open")) {
        const b = live.find((x) => x.round !== "main" && !hasEnded(x, now))
        if (b) return b.parent_ballot_id ?? b.id
    }
    return main[0]?.id ?? null
}

export const winnerCount = (s: Pick<ReleaseStatus, "mainCategoryIds" | "results">): number =>
    s.mainCategoryIds.filter((id) => s.results[id]?.winner_nominee_id != null).length
