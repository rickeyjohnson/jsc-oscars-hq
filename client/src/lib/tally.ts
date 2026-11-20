export type RankedNominee = { nominee_id: string; votes: number; rank: number }
export type CategoryTally = {
  category_id: string
  ranked: RankedNominee[]
  top3_ids: string[]
  nominee_ids: string[]
  leader_ids: string[]
  first_tied: boolean
}

export function tallyCategory(
  categoryId: string,
  votes: { category_id: string; nominee_id: string }[],
  eligibleIds?: string[],
): CategoryTally {
  const counts = new Map<string, number>()
  for (const id of eligibleIds ?? []) counts.set(id, 0)
  for (const vote of votes) {
    if (vote.category_id !== categoryId) continue
    counts.set(vote.nominee_id, (counts.get(vote.nominee_id) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  const ranked: RankedNominee[] = entries.map(([nominee_id, n]) => ({
    nominee_id,
    votes: n,
    rank: 1 + entries.filter(([, other]) => other > n).length,
  }))
  const top3_ids = ranked.filter(r => r.rank <= 3).map(r => r.nominee_id)
  const leader_ids = ranked.filter(r => r.rank === 1).map(r => r.nominee_id)
  const first_tied = leader_ids.length > 1
  return { category_id: categoryId, ranked, top3_ids, nominee_ids: first_tied ? leader_ids : top3_ids, leader_ids, first_tied }
}
