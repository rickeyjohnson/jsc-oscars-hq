import type { BallotRound, ResultRow } from "../types"
import type { CategoryTally } from "./tally"
import { recordPlan, type CategoryView } from "./tallyView"

// Results are recorded automatically once a ballot has ended. A write only ever fills what is missing:
//   expected === null  -> insert, doing nothing if a row appeared meanwhile
//   expected = <id>    -> update only while the row is still decided by that ballot
// so two committee members opening the same ballot at once write the same thing at most once.
export type GuardedWrite = { row: ResultRow; expected: string | null }

export function planAutoRecord(
    round: BallotRound,
    ballotId: string,
    views: CategoryView[],
    results: Record<string, ResultRow>,
    laterBallotIds: Set<string>,
    mainTallies?: Record<string, CategoryTally>,
): GuardedWrite[] {
    if (round === "committee") return [] // winners are entered by hand, never counted
    const plan = recordPlan(round, ballotId, views, results, laterBallotIds, mainTallies)
    const overwrites = new Set(plan.overwrites)
    return plan.rows
        .filter((r) => !overwrites.has(r.category_id)) // never change a recorded winner on its own
        .filter((r) => results[r.category_id]?.decided_ballot_id !== ballotId) // already recorded by this ballot
        .map((row) => ({ row, expected: results[row.category_id]?.decided_ballot_id ?? null }))
}
