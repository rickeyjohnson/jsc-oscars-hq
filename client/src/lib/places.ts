import type { Place, ResultRow } from "../types"
import type { CategoryTally } from "./tally"

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

export function seededOrder(ids: string[], seed: string): string[] {
  const keyed = ids.map(id => ({ id, h: fnv1a(`${seed}:${id}`) }))
  keyed.sort((a, b) => a.h - b.h || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return keyed.map(k => k.id)
}

export type PlaceDecision = { winnerId: string | null; roundTally?: CategoryTally | null }

// Groups ids of equal vote count (descending); ids missing from `votes` form a last group.
function groupByVotes(ids: string[], votes: Map<string, number>): string[][] {
  const present = new Map<number, string[]>()
  const absent: string[] = []
  for (const id of ids) {
    const n = votes.get(id)
    if (n === undefined) absent.push(id)
    else present.set(n, [...(present.get(n) ?? []), id])
  }
  const groups = [...present.entries()].sort((a, b) => b[0] - a[0]).map(([, g]) => g)
  if (absent.length) groups.push(absent)
  return groups
}

export function computePlaces(mainTally: CategoryTally, decision: PlaceDecision, categoryId: string): Place[] {
  const mainVotes = new Map(mainTally.ranked.map(r => [r.nominee_id, r.votes]))
  const { winnerId, roundTally } = decision
  let groups: string[][]
  if (winnerId === null) {
    groups = groupByVotes(mainTally.ranked.map(r => r.nominee_id), mainVotes)
  } else {
    const contenders = mainTally.leader_ids.filter(id => id !== winnerId)
    const contenderSet = new Set(contenders)
    const roundVotes = new Map((roundTally?.ranked ?? []).map(r => [r.nominee_id, r.votes]))
    const rest = mainTally.ranked.map(r => r.nominee_id).filter(id => id !== winnerId && !contenderSet.has(id))
    groups = [[winnerId], ...groupByVotes(contenders, roundVotes), ...groupByVotes(rest, mainVotes)]
  }
  const out: Place[] = []
  let before = 0
  for (const group of groups) {
    const ordered = group.length > 1 ? seededOrder(group, categoryId) : group
    for (const nominee_id of ordered) {
      const i = out.length
      out.push({ nominee_id, slot: i < 3 ? ((i + 1) as 1 | 2 | 3) : null, place: 1 + before, tied: group.length >= 2 })
    }
    before += group.length
  }
  return out
}

export function attachPlaces(row: ResultRow, mainTally: CategoryTally, roundTally: CategoryTally | null): ResultRow {
  return { ...row, places: computePlaces(mainTally, { winnerId: row.winner_nominee_id, roundTally }, row.category_id) }
}

export function backfillPlaces(
  results: ResultRow[],
  mainTallies: Record<string, CategoryTally>,
  roundTallies: Record<string, CategoryTally>,
): { category_id: string; places: Place[] }[] {
  const out: { category_id: string; places: Place[] }[] = []
  for (const row of results) {
    const main = mainTallies[row.category_id]
    if (row.places != null || !main) continue
    out.push({
      category_id: row.category_id,
      places: computePlaces(main, { winnerId: row.winner_nominee_id, roundTally: roundTallies[row.category_id] ?? null }, row.category_id),
    })
  }
  return out
}

export function displayPlaces(row: ResultRow): Place[] {
  if (row.places != null) return row.places
  const ids = [...new Set([row.winner_nominee_id, ...row.nominee_ids, ...row.top3_nominee_ids].filter((x): x is string => x != null))]
  return ids.map((nominee_id, i) => ({ nominee_id, slot: i < 3 ? ((i + 1) as 1 | 2 | 3) : null, place: i + 1, tied: false }))
}
