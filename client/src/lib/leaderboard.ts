import type { Tally } from "./stats"
import type { Member } from "../types"

export type LeaderRow = { member_id: string; name: string; wins: number; noms: number; rate: number; rank: number; tied: boolean }

export function leaderboard(stats: Record<string, Tally>, members: Member[]): LeaderRow[] {
  const base = members.map(m => {
    const t = stats[m.id] ?? { wins: 0, noms: 0 }
    return { member_id: m.id, name: m.name, wins: t.wins, noms: t.noms, rate: t.noms ? Math.round((100 * t.wins) / t.noms) : 0 }
  })
  base.sort((a, b) => b.wins - a.wins || b.rate - a.rate || a.name.localeCompare(b.name))
  return base.map(row => {
    const rank = 1 + base.filter(o => o.wins > row.wins).length
    const tied = base.some(o => o !== row && o.wins === row.wins)
    return { ...row, rank, tied }
  })
}
