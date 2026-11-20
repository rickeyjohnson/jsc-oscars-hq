import type { BallotRound, Nominee, ResultRow } from "../types"
import type { CategoryTally } from "./tally"

export type NextStep = "done" | "tiebreak" | "committee" | "manual"

export function resultForRound(round: BallotRound, ballotId: string, t: CategoryTally, prev: ResultRow | null): ResultRow {
  const winner = t.leader_ids.length === 1 ? t.leader_ids[0] : null
  if (round === "main" || !prev) {
    return {
      category_id: t.category_id,
      decided_ballot_id: ballotId,
      winner_nominee_id: winner,
      nominee_ids: [...t.nominee_ids],
      top3_nominee_ids: [...t.top3_ids],
      decided_by: winner ? (round === "main" ? "votes" : round === "tiebreak" ? "tiebreak" : "committee_vote") : null,
    }
  }
  return {
    ...prev,
    nominee_ids: [...prev.nominee_ids],
    top3_nominee_ids: [...prev.top3_nominee_ids],
    decided_ballot_id: ballotId,
    winner_nominee_id: winner,
    decided_by: winner ? (round === "tiebreak" ? "tiebreak" : "committee_vote") : null,
  }
}

export function nextStep(round: BallotRound, t: CategoryTally, tiedNominees: Nominee[], committeeMemberIds: string[]): NextStep {
  if (t.leader_ids.length === 1) return "done"
  if (round === "main") return t.ranked.length === 0 ? "manual" : "tiebreak"
  if (round === "tiebreak") {
    const covered = new Set(tiedNominees.flatMap(n => n.member_ids))
    return committeeMemberIds.every(id => covered.has(id)) ? "manual" : "committee"
  }
  return "manual"
}

export function manualResult(prev: ResultRow, winnerId: string, ballotId: string): ResultRow {
  return {
    ...prev,
    decided_ballot_id: ballotId,
    winner_nominee_id: winnerId,
    nominee_ids: prev.nominee_ids.length === 0 ? [winnerId] : [...prev.nominee_ids],
    top3_nominee_ids: [...prev.top3_nominee_ids],
    decided_by: "manual",
  }
}
