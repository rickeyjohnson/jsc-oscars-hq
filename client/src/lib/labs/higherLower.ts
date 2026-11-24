import { MIN_RATE_NOMS_ALL, expectedWins, perSemesterAverage, totals, type StatsModel } from "../statsLab"

/** Higher or lower: two members, one stat, tap who has more. Every metric comes from the real stats model. */

export type Metric = {
    key: string
    /** The whole question, in proper English for that stat ("Who has more wins?", "Who has a higher win rate?"). */
    question: string
    value: (m: StatsModel, id: string) => number | null
    fmt: (v: number) => string
}

const whole = (v: number) => String(Math.round(v))
const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1)
const pct = (v: number) => `${(Math.round(v * 10) / 10).toFixed(1)}%`

const bestSem = (m: StatsModel, id: string): number | null => {
    const wins = (m.cells[id] ?? []).filter((c): c is { noms: number; wins: number } => c !== null).map((c) => c.wins)
    return wins.length > 0 ? Math.max(...wins) : null
}
const worstRateSem = (m: StatsModel, id: string): number | null => {
    const rates = (m.cells[id] ?? []).filter((c): c is { noms: number; wins: number } => c !== null && c.noms >= 3).map((c) => (c.wins / c.noms) * 100)
    return rates.length > 0 ? Math.min(...rates) : null
}
const bestRateSem = (m: StatsModel, id: string): number | null => {
    const rates = (m.cells[id] ?? []).filter((c): c is { noms: number; wins: number } => c !== null && c.noms >= 3).map((c) => (c.wins / c.noms) * 100)
    return rates.length > 0 ? Math.max(...rates) : null
}
const lossStreak = (m: StatsModel, id: string): number | null => {
    const cells = (m.cells[id] ?? []).filter((c) => c !== null)
    if (cells.length === 0) return null
    let best = 0
    let cur = 0
    for (const c of cells) {
        cur = c && c.wins === 0 ? cur + 1 : 0
        best = Math.max(best, cur)
    }
    return best
}
const winStreak = (m: StatsModel, id: string): number | null => {
    const cells = (m.cells[id] ?? []).filter((c) => c !== null)
    if (cells.length === 0) return null
    let best = 0
    let cur = 0
    for (const c of cells) {
        cur = c && c.wins > 0 ? cur + 1 : 0
        best = Math.max(best, cur)
    }
    return best
}

export const METRICS: Metric[] = [
    { key: "wins", question: "Who has more total wins?", value: (m, id) => (totals(m, id).noms > 0 ? totals(m, id).wins : null), fmt: whole },
    { key: "noms", question: "Who has more total nominations?", value: (m, id) => (totals(m, id).noms > 0 ? totals(m, id).noms : null), fmt: whole },
    { key: "rate", question: "Who has a higher win rate?", value: (m, id) => { const t = totals(m, id); return t.noms >= MIN_RATE_NOMS_ALL ? (t.wins / t.noms) * 100 : null }, fmt: pct },
    { key: "wps", question: "Who averages more wins per semester?", value: (m, id) => perSemesterAverage(m, id)?.wins ?? null, fmt: one },
    { key: "nps", question: "Who averages more nominations per semester?", value: (m, id) => perSemesterAverage(m, id)?.noms ?? null, fmt: one },
    { key: "sems", question: "Who has played more semesters?", value: (m, id) => (totals(m, id).sem > 0 ? totals(m, id).sem : null), fmt: whole },
    { key: "bestSem", question: "Who has more wins in their best semester?", value: bestSem, fmt: whole },
    { key: "bestRate", question: "Who has a higher win rate in their best semester?", value: bestRateSem, fmt: pct },
    { key: "worstRate", question: "Who has a higher win rate in their worst semester?", value: worstRateSem, fmt: pct },
    { key: "over", question: "Who has more wins above what was expected?", value: (m, id) => (totals(m, id).noms >= MIN_RATE_NOMS_ALL ? expectedWins(m, id).diff : null), fmt: (v) => (v > 0 ? `+${one(v)}` : one(v)) },
    { key: "winStreak", question: "Who has a longer run of semesters with a win?", value: winStreak, fmt: whole },
    { key: "lossStreak", question: "Who has a longer run of semesters without a win?", value: lossStreak, fmt: whole },
]

export type Pair = { metric: Metric; a: string; b: string; va: number; vb: number }

/** A random metric (not the one just used) and two members with different values for it; null when the stats cannot make one. */
export function pickPair(r: () => number, m: StatsModel, opts: { avoidKey?: string; keep?: string } = {}): Pair | null {
    const metrics = METRICS.filter((x) => x.key !== opts.avoidKey).sort(() => r() - 0.5)
    for (const metric of metrics) {
        const rows = m.members.map((x) => ({ id: x.id, v: metric.value(m, x.id) })).filter((x): x is { id: string; v: number } => x.v !== null)
        const keepRow = opts.keep ? rows.find((x) => x.id === opts.keep) : undefined
        if (opts.keep && !keepRow) continue
        const left = keepRow ?? rows[Math.floor(r() * rows.length)]
        const rivals = rows.filter((x) => x.id !== left?.id && x.v !== left?.v)
        if (!left || rivals.length === 0) continue
        const right = rivals[Math.floor(r() * rivals.length)]
        return { metric, a: left.id, b: right.id, va: left.v, vb: right.v }
    }
    return null
}

export const winnerSide = (p: Pair): "a" | "b" => (p.va > p.vb ? "a" : "b")

/** The text copied from the game-over screen: short enough for a group chat. */
export const shareText = (streak: number, best: number, url: string): string => {
    const fire = streak >= 10 ? " 🔥🔥" : streak >= 5 ? " 🔥" : ""
    return `JSC Oscars Higher or Lower\nStreak: ${streak}${fire}${best > streak ? ` (best ${best})` : streak > 0 ? " (new best!)" : ""}\n${url}`
}
