import type { Tally } from "./stats"
import type { Category, Member, ResultRow } from "../types"

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

export type MyCategory = { category_id: string; label: string }

export function myCategories(categories: Category[], results: Record<string, ResultRow>, memberId: string, members: Member[]): { won: MyCategory[]; nominatedOnly: MyCategory[] } {
  const names = new Map(members.map(m => [m.id, m.name]))
  const won: MyCategory[] = []
  const nominatedOnly: MyCategory[] = []
  for (const category of categories) {
    const row = results[category.id]
    if (!row) continue
    const byId = new Map(category.nominees.map(n => [n.id, n]))
    const winner = row.winner_nominee_id ? byId.get(row.winner_nominee_id) : undefined
    const ids = new Set(row.nominee_ids)
    if (row.winner_nominee_id) ids.add(row.winner_nominee_id)
    const mineNominee = [...ids].map(id => byId.get(id)).filter((n): n is NonNullable<typeof n> => !!n && n.member_ids.includes(memberId))
    if (mineNominee.length === 0) continue
    const isWin = !!winner && winner.member_ids.includes(memberId)
    const source = isWin ? winner : mineNominee[0]
    const others = source.member_ids.filter(id => id !== memberId).map(id => names.get(id) ?? "Unknown").sort()
    const label = others.length > 0 ? `${category.name} (with ${others.join(", ")})` : category.name
    ;(isWin ? won : nominatedOnly).push({ category_id: category.id, label })
  }
  return { won, nominatedOnly }
}
