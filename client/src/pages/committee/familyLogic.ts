import { planAutoRecord, type GuardedWrite } from "../../lib/autoRecord"
import { phaseOf } from "../../lib/ballotFlow"
import { backfillPlaces } from "../../lib/places"
import { tallyCategory, type CategoryTally } from "../../lib/tally"
import { buildCategoryViews, ROUND_ORDER, type CategoryView } from "../../lib/tallyView"
import type { BallotSummary } from "../../lib/voting"
import type { Place, ResultRow } from "../../types"
import { familyBallots, type Family } from "./useBallotFamily"

export function viewsFor(f: Family, b: BallotSummary, results: Record<string, ResultRow> = f.results): CategoryView[] {
    const d = f.details[b.id]
    return buildCategoryViews({
        round: b.round,
        categories: d.categories,
        mainCategories: f.details[f.main.id].categories,
        votes: f.votes[b.id] ?? [],
        results,
        committeeMemberIds: f.committeeMemberIds,
    })
}

export const mainTallies = (f: Family): Record<string, CategoryTally> =>
    Object.fromEntries(f.details[f.main.id].categories.map((c) => [c.id, tallyCategory(c.id, f.votes[f.main.id] ?? [])]))

// Everything the automatic record step still has to write: main first, then each ended round, each planned
// against the results the earlier ones would leave. Committee rounds are never counted.
export function pendingWrites(f: Family, now: Date): GuardedWrite[] {
    const tallies = mainTallies(f)
    let results = { ...f.results }
    const out: GuardedWrite[] = []
    for (const b of familyBallots(f)) {
        if (b.round === "committee" || phaseOf(b, now) !== "closed") continue
        const later = new Set(f.rounds.filter((r) => ROUND_ORDER[r.round] > ROUND_ORDER[b.round]).map((r) => r.id))
        const writes = planAutoRecord(b.round, b.id, viewsFor(f, b, results), results, later, tallies)
        for (const w of writes) results = { ...results, [w.row.category_id]: w.row }
        out.push(...writes)
    }
    return out
}

// Rows recorded before podium places existed: filled quietly as part of recording.
export function placeFixes(f: Family): { category_id: string; places: Place[] }[] {
    const missing = Object.values(f.results).filter((r) => r.places == null)
    if (missing.length === 0) return []
    const roundTallies: Record<string, CategoryTally> = {}
    for (const rb of f.rounds) {
        if (rb.round === "committee") continue
        for (const c of f.details[rb.id].categories) {
            if (missing.some((r) => r.category_id === c.id && r.decided_ballot_id === rb.id)) roundTallies[c.id] = tallyCategory(c.id, f.votes[rb.id] ?? [], c.nominees.map((n) => n.id))
        }
    }
    return backfillPlaces(missing, mainTallies(f), roundTallies)
}
