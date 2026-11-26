// Stats math for Larry's tools. Mirrors client/src/lib/statsLab.ts (a test checks they agree).
export type PastRow = { season_label: string; season_order: number; member_id: string; noms: number; wins: number }
export type Member = { id: string; name: string }
export type SortKey = "wins" | "noms" | "rate"

/** A rate needs this many nominations to be ranked, so a 2-of-3 run cannot top the board. */
export const MIN_RATE_NOMS = 10
/** Counted from slides: nominations for these seasons are lower bounds. */
export const APPROX_LABELS = ["Fall 23", "Fall 24"]

export type Totals = { wins: number; noms: number; seasons: number; rate: number | null; approx: boolean }

export function totalsFor(rows: PastRow[], memberId: string): Totals {
    let wins = 0
    let noms = 0
    let approx = false
    const seasons = new Set<string>()
    for (const r of rows) {
        if (r.member_id !== memberId || !(r.noms > 0)) continue
        wins += r.wins
        noms += r.noms
        seasons.add(r.season_label)
        if (APPROX_LABELS.includes(r.season_label)) approx = true
    }
    return { wins, noms, seasons: seasons.size, rate: noms > 0 ? (wins / noms) * 100 : null, approx }
}

export type BoardRow = Totals & { rank: number | null; tied: boolean; id: string; name: string }

/** Everyone with nominations, best first. Ties share a rank. A rate board leaves out members under MIN_RATE_NOMS. */
export function leaderboard(rows: PastRow[], members: Member[], sort: SortKey): BoardRow[] {
    const key = (t: Totals): number => (sort === "rate" ? (t.rate ?? 0) : t[sort])
    const all = members
        .map((m) => ({ ...totalsFor(rows, m.id), id: m.id, name: m.name }))
        .filter((t) => t.noms > 0 && (sort !== "rate" || t.noms >= MIN_RATE_NOMS))
    all.sort((a, b) => key(b) - key(a) || b.wins - a.wins || a.name.localeCompare(b.name))
    return all.map((t) => {
        const better = all.filter((o) => key(o) > key(t)).length
        const same = all.filter((o) => key(o) === key(t)).length
        return { ...t, rank: better + 1, tied: same > 1 }
    })
}
