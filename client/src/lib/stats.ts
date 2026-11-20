import type { Nominee, ResultRow } from "../types"

export type Tally = { wins: number; noms: number }

export function nomineeStats(
  results: ResultRow[],
  nominees: Record<string, Nominee>,
): { members: Record<string, Tally>; others: Record<string, Tally> } {
  const members: Record<string, Tally> = {}
  const others: Record<string, Tally> = {}
  const bump = (bucket: Record<string, Tally>, key: string, field: keyof Tally) => {
    bucket[key] ??= { wins: 0, noms: 0 }
    bucket[key][field] += 1
  }
  for (const row of results) {
    const nomMembers = new Set<string>()
    const winMembers = new Set<string>()
    const nomOthers = new Set<string>()
    const winOthers = new Set<string>()
    const ids = new Set(row.nominee_ids)
    if (row.winner_nominee_id) ids.add(row.winner_nominee_id)
    for (const id of ids) {
      const nominee = nominees[id]
      if (!nominee) continue
      const isWinner = id === row.winner_nominee_id
      if (nominee.member_ids.length > 0) {
        for (const m of nominee.member_ids) {
          nomMembers.add(m)
          if (isWinner) winMembers.add(m)
        }
      } else {
        nomOthers.add(nominee.display_name)
        if (isWinner) winOthers.add(nominee.display_name)
      }
    }
    nomMembers.forEach(k => bump(members, k, "noms"))
    winMembers.forEach(k => bump(members, k, "wins"))
    nomOthers.forEach(k => bump(others, k, "noms"))
    winOthers.forEach(k => bump(others, k, "wins"))
  }
  return { members, others }
}
