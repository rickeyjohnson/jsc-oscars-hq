import type { BallotRound, Category, DecidedBy, ResultRow } from "../types"
import { attachPlaces } from "./places"
import { nextStep, resultForRound, type NextStep } from "./rounds"
import { tallyCategory, type CategoryTally, type RankedNominee } from "./tally"

export type Badge = "winner" | "tiebreak" | "committee" | "manual"

export type CategoryView = {
    category_id: string
    number: number
    name: string
    tally: CategoryTally
    step: NextStep
    badge: Badge
    recordedWinnerId: string | null
    recordedBy: DecidedBy | null
    shown: RankedNominee[]
    more: RankedNominee[]
    manualOptions: string[]
}

type ViewInput = {
    round: BallotRound
    // this ballot's categories; on a round ballot only its categories with only its nominees
    categories: Category[]
    // the main ballot's categories (numbering, full nominee lists)
    mainCategories: Category[]
    votes: { category_id: string; nominee_id: string }[]
    results: Record<string, ResultRow>
    committeeMemberIds: string[]
}

// Per-category panel view: tally, next step, badge, ranked rows (ranks 1-3 shown) and manual-pick options.
export function buildCategoryViews({ round, categories, mainCategories, votes, results, committeeMemberIds }: ViewInput): CategoryView[] {
    return categories.map((c) => {
        const mainIndex = mainCategories.findIndex((m) => m.id === c.id)
        const full = mainIndex >= 0 ? mainCategories[mainIndex] : c
        const eligible = round === "main" ? undefined : c.nominees.map((n) => n.id)
        const tally = tallyCategory(c.id, votes, eligible)
        const byId = new Map([...full.nominees, ...c.nominees].map((n) => [n.id, n]))
        const tied = tally.leader_ids.map((id) => byId.get(id)).filter((n) => n !== undefined)
        const step = nextStep(round, tally, tied, committeeMemberIds)
        const rec = results[c.id]
        const recordedWinnerId = rec?.winner_nominee_id ?? null
        const badge: Badge = recordedWinnerId || step === "done" ? "winner" : step
        let manualOptions: string[] = []
        if (step === "manual" && !recordedWinnerId) {
            if (round !== "main" && tally.leader_ids.length > 1) manualOptions = [...tally.leader_ids]
            else if (rec && rec.nominee_ids.length > 0) manualOptions = [...rec.nominee_ids]
            else manualOptions = full.nominees.map((n) => n.id)
        }
        return {
            category_id: c.id,
            number: (mainIndex >= 0 ? mainIndex : categories.indexOf(c)) + 1,
            name: c.name,
            tally,
            step,
            badge,
            recordedWinnerId,
            recordedBy: rec?.decided_by ?? null,
            shown: tally.ranked.filter((r) => r.rank <= 3),
            more: tally.ranked.filter((r) => r.rank > 3),
            manualOptions,
        }
    })
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

export function summaryLine(views: CategoryView[]): string {
    const ties = views.filter((v) => v.badge === "tiebreak" || v.badge === "committee").length
    const manual = views.filter((v) => v.badge === "manual").length
    return `${plural(views.length, "category", "categories")} · ${plural(ties, "tie")} · ${plural(manual, "manual pick")}`
}

export type RecordPlan = { rows: ResultRow[]; overwrites: string[]; skipped: string[] }

// Rows "Record results" writes. Skips categories decided by a later round (laterBallotIds)
// and never replaces a recorded winner with "no winner" (keeps manual picks).
// overwrites = categories whose recorded winner would change (ask before writing).
// Every written row carries podium places: from the main ballot's tally (mainTallies, falling back
// to this ballot's tally), with a round ballot's tally ordering the main-ballot contenders.
export function recordPlan(
    round: BallotRound,
    ballotId: string,
    views: CategoryView[],
    results: Record<string, ResultRow>,
    laterBallotIds: Set<string>,
    mainTallies?: Record<string, CategoryTally>,
): RecordPlan {
    const plan: RecordPlan = { rows: [], overwrites: [], skipped: [] }
    for (const v of views) {
        const existing = results[v.category_id] ?? null
        const row = resultForRound(round, ballotId, v.tally, existing)
        if (existing && (laterBallotIds.has(existing.decided_ballot_id) || (existing.winner_nominee_id && !row.winner_nominee_id))) {
            plan.skipped.push(v.category_id)
            continue
        }
        if (existing?.winner_nominee_id && existing.winner_nominee_id !== row.winner_nominee_id) plan.overwrites.push(v.category_id)
        plan.rows.push(attachPlaces(row, mainTallies?.[v.category_id] ?? v.tally, round === "main" ? null : v.tally))
    }
    return plan
}

// Base row for a manual pick when nothing has been recorded for the category yet.
export function manualBase(round: BallotRound, ballotId: string, v: CategoryView, existing: ResultRow | undefined): ResultRow {
    return existing ?? resultForRound(round, ballotId, v.tally, null)
}

export const ROUND_ORDER: Record<BallotRound, number> = { main: 0, tiebreak: 1, committee: 2 }
