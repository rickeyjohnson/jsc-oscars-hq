import type { BallotSummary } from "../../lib/voting"
import { countdownParts } from "../../lib/time"
import type { PebbleName } from "../tokens"

export type YouStat = { label: string; value: string; pebble: PebbleName | null; /** Hidden until the reveal (so winners never leak). */ locked?: boolean }
export type YouStats = { tiles: YouStat[]; plain: YouStat[] }

// Wins / Noms / Win rate are plain cards like the rest; wins and win rate stay locked until results are released, Noms always shows.
// `noms` is the member's nominations (known before the reveal); `tally` (wins) exists only after release.
export function youStats(i: { released: boolean; summaries: BallotSummary[]; tally: { wins: number; noms: number } | null; noms: number | null; ceremonyAt: Date | null; now: Date }): YouStats {
    const noms = i.released ? (i.tally?.noms ?? 0) : (i.noms ?? 0)
    const wins = i.tally?.wins ?? 0
    const rate = noms > 0 ? Math.round((wins / noms) * 100) : 0
    const tiles: YouStat[] = [
        i.released ? { label: "Wins", value: String(wins), pebble: null } : { label: "Wins", value: "After the reveal", pebble: null, locked: true },
        { label: "Noms", value: String(noms), pebble: null },
        i.released ? { label: "Win rate", value: `${rate}%`, pebble: null } : { label: "Win rate", value: "After the reveal", pebble: null, locked: true },
    ]
    const counted = i.summaries.filter((b) => b.category_count > 0)
    const done = counted.filter((b) => b.my_vote_count >= b.category_count).length
    const out: [string, string][] = [
        ["Ballots voted", `${done} of ${counted.length}`],
        ["Categories voted", String(i.summaries.reduce((n, b) => n + b.my_vote_count, 0))],
    ]
    const left = i.ceremonyAt ? countdownParts(i.ceremonyAt, i.now) : null
    if (left) out.push(["Days to Oscars", String(left.days)])
    return { tiles, plain: out.map(([label, value]) => ({ label, value, pebble: null })) }
}
