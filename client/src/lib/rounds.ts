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

export type RoundEntry = { category_id: string; nominee_ids: string[] }

// Nominees for a new round ballot. tiebreak: the tied leaders of each category whose main
// nextStep is "tiebreak". committee: the previous nominee list kept to the tiebreak leaders
// (the caller passes only categories whose nextStep is "committee").
export function roundEntries(tallies: CategoryTally[], step: NextStep, prevByCategory: Record<string, ResultRow>): RoundEntry[] {
  if (step === "tiebreak") {
    return tallies
      .filter(t => nextStep("main", t, [], []) === "tiebreak")
      .map(t => ({ category_id: t.category_id, nominee_ids: [...t.leader_ids] }))
  }
  if (step === "committee") {
    return tallies
      .filter(t => t.leader_ids.length > 1)
      .map(t => {
        const prev = prevByCategory[t.category_id]
        const leaders = new Set(t.leader_ids)
        const kept = prev ? prev.nominee_ids.filter(id => leaders.has(id)) : []
        return { category_id: t.category_id, nominee_ids: kept.length > 1 ? kept : [...t.leader_ids] }
      })
  }
  return []
}
