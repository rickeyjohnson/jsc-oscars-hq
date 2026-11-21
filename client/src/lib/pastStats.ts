import type { Tally } from "./stats"
import type { Member } from "../types"

export type PastStatRow = { season_label: string; season_order: number; member_id: string; noms: number; wins: number }
export type Semester = { label: string; order: number }
export type PastLeaderRow = { member_id: string; name: string; wins: number; noms: number; pct: string | null; rank: number; tied: boolean }

export const ALL_TIME = "all"
export const NO_RATE = "—"
export const NO_RATE_LABEL = "No nominations yet"

/** What to show for a win % (null = no nominations). */
export const rateText = (pct: string | null): string => pct ?? NO_RATE

/** wins / noms rounded to 2 decimals, shown like "44.44%". No nominations: null (shown as a dash; never a divide by zero). */
export function winPct(wins: number, noms: number): string | null {
    if (!(noms > 0)) return null
    return `${(Math.round((wins / noms) * 10000) / 100).toFixed(2)}%`
}

const pctValue = (wins: number, noms: number): number => (noms > 0 ? Math.round((wins / noms) * 10000) : 0)

/** Semesters in chronological order (season_order, then label). */
export function semesters(rows: PastStatRow[]): Semester[] {
    const seen = new Map<string, number>()
    for (const r of rows) if (!seen.has(r.season_label)) seen.set(r.season_label, r.season_order)
    return [...seen].map(([label, order]) => ({ label, order })).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
}

/** Lifetime totals per member: every past row plus, when given, the current season (only pass it once released). */
export function lifetimeTotals(rows: PastStatRow[], current?: Record<string, Tally> | null): Record<string, Tally> {
    const out: Record<string, Tally> = {}
    const add = (id: string, t: Tally) => {
        const o = (out[id] ??= { wins: 0, noms: 0 })
        o.wins += t.wins
        o.noms += t.noms
    }
    for (const r of rows) add(r.member_id, r)
    if (current) for (const [id, t] of Object.entries(current)) add(id, t)
    return out
}

/** One member's lifetime tally; a member with no rows is 0 / 0. */
export const lifetimeFor = (memberId: string, rows: PastStatRow[], current?: Record<string, Tally> | null): Tally => lifetimeTotals(rows, current)[memberId] ?? { wins: 0, noms: 0 }

/**
 * Leaderboard for a semester (label) or all time. A semester lists only members who have a row in it;
 * all time lists every member (no rows = 0 / 0). Ranked by wins, then win %, then name (stable); equal wins and % share a rank.
 */
export function pastLeaderboard(rows: PastStatRow[], members: Member[], scope: string, current?: Record<string, Tally> | null): PastLeaderRow[] {
    const all = scope === ALL_TIME
    const totals = all ? lifetimeTotals(rows, current) : lifetimeTotals(rows.filter((r) => r.season_label === scope))
    const base = members
        .filter((m) => all || totals[m.id])
        .map((m) => {
            const t = totals[m.id] ?? { wins: 0, noms: 0 }
            return { member_id: m.id, name: m.name, wins: t.wins, noms: t.noms, pct: winPct(t.wins, t.noms), v: pctValue(t.wins, t.noms) }
        })
    base.sort((a, b) => b.wins - a.wins || b.v - a.v || a.name.localeCompare(b.name))
    return base.map(({ v, ...row }) => {
        const better = base.filter((o) => o.wins > row.wins || (o.wins === row.wins && o.v > v)).length
        const tied = base.some((o) => o.member_id !== row.member_id && o.wins === row.wins && o.v === v)
        return { ...row, rank: 1 + better, tied }
    })
}
