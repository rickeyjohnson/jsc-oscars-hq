import type { Ballot, ResultRow, Season } from "../types"

export type ReleaseCheck = { id: "ballots_closed" | "no_round_open" | "winners"; label: string; ok: boolean }
export type ReleaseStatus = { season: Season; ballots: Ballot[]; mainCategoryIds: string[]; results: Record<string, ResultRow> }
export type ReleaseIO = {
    load(seasonId: string): Promise<ReleaseStatus>
    releaseBallots(seasonId: string, nowIso: string): Promise<void>
    markSeasonReleased(seasonId: string, nowIso: string): Promise<boolean>
}

// Slack for the browser clock being ahead of the server's.
export const CLOCK_SKEW_MS = 60_000

// closed/released, or open with its window over (by at least CLOCK_SKEW_MS). Drafts never count as ended.
export const hasEnded = (b: Ballot, now: Date): boolean =>
    b.status === "closed" || b.status === "released" || (b.status === "open" && new Date(b.closes_at).getTime() <= now.getTime() - CLOCK_SKEW_MS)

// Drafts are ignored everywhere.
export function releaseChecks(s: Omit<ReleaseStatus, "season">, now: Date): { checks: ReleaseCheck[]; ready: boolean } {
    const live = s.ballots.filter((b) => b.status !== "draft")
    const main = live.filter((b) => b.round === "main")
    const ended = main.filter((b) => hasEnded(b, now)).length
    const openRounds = live.filter((b) => b.round !== "main" && !hasEnded(b, now)).length
    const n = s.mainCategoryIds.length
    const w = s.mainCategoryIds.filter((id) => s.results[id]?.winner_nominee_id != null).length
    const checks: ReleaseCheck[] = [
        { id: "ballots_closed", ok: main.length > 0 && ended === main.length, label: `${ended} of ${main.length} ballots closed` },
        {
            id: "no_round_open",
            ok: openRounds === 0,
            label: openRounds === 0 ? "No tiebreak or committee round open" : `${openRounds} tiebreak/committee round(s) still open`,
        },
        { id: "winners", ok: n > 0 && w === n, label: `${w} of ${n} categories have a winner` },
    ]
    return { checks, ready: checks.every((c) => c.ok) }
}

// Ballots are marked released FIRST; the season's results_released_at (what members see) LAST.
// Nothing is written when a check fails or the season is already released.
export async function runRelease(io: ReleaseIO, seasonId: string, now: Date): Promise<void> {
    const status = await io.load(seasonId)
    if (status.season.results_released_at) throw new Error("Results are already released")
    const { checks, ready } = releaseChecks(status, now)
    if (!ready) {
        const failing = checks.filter((c) => !c.ok).map((c) => c.label)
        throw new Error(`Not ready to release: ${failing.join("; ")}`)
    }
    const nowIso = now.toISOString()
    await io.releaseBallots(seasonId, nowIso)
    const saved = await io.markSeasonReleased(seasonId, nowIso)
    if (!saved) {
        // Someone else may have released in between; re-read before blaming permissions.
        const after = await io.load(seasonId)
        if (after.season.results_released_at) throw new Error("Results are already released")
        throw new Error("Release did not save. Check you are signed in as committee.")
    }
}
