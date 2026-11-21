import type { PebbleName } from "../tokens"

export type YouStat = { label: string; value: string; pebble: PebbleName | null; /** Hidden until the reveal (so winners never leak). */ locked?: boolean }
export type YouStats = { tiles: YouStat[] }

// Wins / Noms / Win rate are plain cards like the rest; wins and win rate stay locked until results are released, Noms always shows.
// `noms` is the member's nominations (known before the reveal); `tally` (wins) exists only after release.
export function youStats(i: { released: boolean; tally: { wins: number; noms: number } | null; noms: number | null }): YouStats {
    const noms = i.released ? (i.tally?.noms ?? 0) : (i.noms ?? 0)
    const wins = i.tally?.wins ?? 0
    const rate = noms > 0 ? Math.round((wins / noms) * 100) : 0
    const tiles: YouStat[] = [
        i.released ? { label: "Wins", value: String(wins), pebble: null } : { label: "Wins", value: "After the reveal", pebble: null, locked: true },
        { label: "Noms", value: String(noms), pebble: null },
        i.released ? { label: "Win rate", value: `${rate}%`, pebble: null } : { label: "Win rate", value: "After the reveal", pebble: null, locked: true },
    ]
    return { tiles }
}
