import type { BallotSummary } from "../../lib/voting"
import { countdownParts } from "../../lib/time"
import { RESULTS_EXCLUDE, pebbleAt } from "./pebble"
import type { PebbleName } from "../tokens"

export type YouStat = { label: string; value: string; pebble: PebbleName | null }

export function youStats(i: { released: boolean; summaries: BallotSummary[]; tally: { wins: number; noms: number } | null; ceremonyAt: Date | null; now: Date }): YouStat[] {
    if (i.released) {
        const t = i.tally ?? { wins: 0, noms: 0 }
        const rate = t.noms > 0 ? Math.round((t.wins / t.noms) * 100) : 0
        const v = [["Wins", String(t.wins)], ["Nominations", String(t.noms)], ["Win rate", `${rate}%`]]
        return v.map(([label, value], k) => ({ label, value, pebble: pebbleAt(k, { exclude: RESULTS_EXCLUDE }) }))
    }
    const counted = i.summaries.filter((b) => b.category_count > 0)
    const done = counted.filter((b) => b.my_vote_count >= b.category_count).length
    const out: [string, string][] = [
        ["Ballots voted", `${done} of ${counted.length}`],
        ["Categories voted", String(i.summaries.reduce((n, b) => n + b.my_vote_count, 0))],
    ]
    const left = i.ceremonyAt ? countdownParts(i.ceremonyAt, i.now) : null
    if (left) out.push(["Days to Oscars", String(left.days)])
    return out.map(([label, value]) => ({ label, value, pebble: null }))
}
