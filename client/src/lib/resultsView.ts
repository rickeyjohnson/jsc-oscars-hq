import { displayPlaces } from "./places"
import type { Category, DecidedBy, ResultRow } from "../types"

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}

export type PodiumEntry = { nominee_id: string; name: string; slot: 1 | 2 | 3; tieLabel: string | null; memberIds: string[] }
export type ResultCard = {
  category_id: string
  number: number
  name: string
  podium: PodiumEntry[]
  also: { nominee_id: string; name: string; placeLabel: string }[]
  note: string | null
  pending: boolean
}

const NOTES: Partial<Record<DecidedBy, string>> = {
  tiebreak: "Winner decided by tiebreak",
  committee_vote: "Winner decided by committee vote",
  manual: "Winner picked by the committee",
}

const DISPLAY_ORDER: Record<1 | 2 | 3, number> = { 2: 0, 1: 1, 3: 2 }

export function buildResultCards(categories: Category[], results: Record<string, ResultRow>): ResultCard[] {
  return categories.map((category, i) => {
    const base = { category_id: category.id, number: i + 1, name: category.name }
    const row = results[category.id]
    if (!row || row.winner_nominee_id == null) return { ...base, podium: [], also: [], note: null, pending: true }
    const byId = new Map(category.nominees.map(n => [n.id, n]))
    const nameOf = (id: string) => byId.get(id)?.display_name ?? "Unknown nominee"
    const stored = displayPlaces(row)
    // stored places that disagree with the recorded winner fall back to winner-first order
    const places = stored.find(p => p.slot === 1)?.nominee_id === row.winner_nominee_id ? stored : displayPlaces({ ...row, places: null })
    const podium: PodiumEntry[] = places
      .filter((p): p is typeof p & { slot: 1 | 2 | 3 } => p.slot != null)
      .sort((a, b) => DISPLAY_ORDER[a.slot] - DISPLAY_ORDER[b.slot])
      .map(p => ({
        nominee_id: p.nominee_id,
        name: nameOf(p.nominee_id),
        slot: p.slot,
        tieLabel: p.tied ? `tied ${ordinal(p.place)}` : null,
        memberIds: byId.get(p.nominee_id)?.member_ids ?? [],
      }))
    const also = places
      .filter(p => p.slot == null)
      .map(p => ({ nominee_id: p.nominee_id, name: nameOf(p.nominee_id), placeLabel: p.tied ? `tied ${ordinal(p.place)}` : ordinal(p.place) }))
    return { ...base, podium, also, note: row.decided_by ? NOTES[row.decided_by] ?? null : null, pending: false }
  })
}
