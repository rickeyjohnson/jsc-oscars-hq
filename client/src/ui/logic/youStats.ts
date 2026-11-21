import type { PebbleName } from "../tokens"
import { winPct } from "../../lib/pastStats"

export type YouStat = { label: string; value: string; pebble: PebbleName | null; /** Hidden until the reveal (so winners never leak). */ locked?: boolean; /** Tiny line under the label. */ caption?: string }
export type YouStats = { tiles: YouStat[] }

// Wins / Noms / Win rate are plain cards like the rest; wins and win rate stay locked until results are released, Noms always shows.
// `noms` is the member's nominations (known before the reveal); `tally` (wins) exists only after release.
// With `past` (the member's previous-semester totals, public; 0 / 0 for a member with no rows) the tiles are lifetime totals:
// past + this season once released. Before the reveal only this season's wins stay hidden: Wins and Win rate show the
// past totals (captioned "Before this season") and Noms adds this season's nominations. Win rate with 0 noms is "0%".
export function youStats(i: { released: boolean; tally: { wins: number; noms: number } | null; noms: number | null; past?: { wins: number; noms: number } | null }): YouStats {
    if (i.past) {
        const p = i.past
        const cur = i.released ? (i.tally ?? { wins: 0, noms: 0 }) : { wins: 0, noms: i.noms ?? 0 }
        const noms = p.noms + cur.noms
        const before = i.released ? "All time" : "Before this season"
        return {
            tiles: [
                { label: "Wins", value: String(p.wins + cur.wins), pebble: null, caption: before },
                { label: "Noms", value: String(noms), pebble: null, caption: "All time" },
                { label: "Win rate", value: i.released ? winPct(p.wins + cur.wins, noms) : winPct(p.wins, p.noms), pebble: null, caption: before },
            ],
        }
    }
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
