import { semesters, type PastStatRow } from "./pastStats"
import type { Tally } from "./stats"

// Pure stats math for My stats and the Leaderboard. Everything works on a StatsModel: one column per semester,
// one cell per member per semester. A semester a member was not in (or had no nominations in) is a null cell:
// shown as a dash, never as a zero, and never drawn through.

export type Cell = { noms: number; wins: number } | null
export type Sem = { label: string; short: string; order: number; /** Counted from slides: nominations are a lower bound. */ approx: boolean; current: boolean }
export type StatsModel = { sems: Sem[]; members: { id: string; name: string }[]; cells: Record<string, Cell[]> }

/** Semesters counted from the slides (at most 3 nominees per category showed), so noms are lower bounds. */
export const APPROX_LABELS = ["Fall 23", "Fall 24"]
export const APPROX_MARK = "~"
export const MIN_RATE_NOMS_ALL = 10
export const MIN_RATE_NOMS_SEM = 5
/** Expected vs actual is "on par" within this many wins. */
export const PAR_BAND = 0.5

/** "Fall 25" -> "F25", "Spring 24" -> "S24", "Fall 2026" -> "F26". Anything else: its first 4 characters. */
export function shortLabel(label: string): string {
    const m = /^(fall|spring)\s+(?:20)?(\d{2})$/i.exec(label.trim())
    return m ? `${m[1][0].toUpperCase()}${m[2]}` : label.trim().slice(0, 4)
}

export const rate = (wins: number, noms: number): number | null => (noms > 0 ? (wins / noms) * 100 : null)
/** "33.3%" or the em dash for no nominations. */
export const fmtRate = (v: number | null, digits = 1): string => (v === null ? "—" : `${v.toFixed(digits)}%`)

/**
 * `current` is the live season, passed ONLY once its results are released: it becomes the last column.
 * Rows of unknown members are ignored. A row with 0 nominations is the same as no row.
 */
export function buildModel(i: { rows: PastStatRow[]; members: { id: string; name: string }[]; current?: { label: string; tallies: Record<string, Tally> } | null }): StatsModel {
    const past = semesters(i.rows)
    const sems: Sem[] = past.map((s) => ({ label: s.label, short: shortLabel(s.label), order: s.order, approx: APPROX_LABELS.includes(s.label), current: false }))
    if (i.current) sems.push({ label: i.current.label, short: shortLabel(i.current.label), order: (past.at(-1)?.order ?? 0) + 1, approx: false, current: true })
    const index = new Map(sems.map((s, k) => [s.label, k]))
    const cells: Record<string, Cell[]> = {}
    for (const m of i.members) cells[m.id] = sems.map(() => null)
    const put = (id: string, k: number, t: Tally) => {
        const row = cells[id]
        if (!row || !(t.noms > 0)) return
        const c = (row[k] ??= { noms: 0, wins: 0 })
        c.noms += t.noms
        c.wins += t.wins
    }
    for (const r of i.rows) put(r.member_id, index.get(r.season_label) ?? -1, r)
    if (i.current) for (const [id, t] of Object.entries(i.current.tallies)) put(id, sems.length - 1, t)
    return { sems, members: i.members.map((m) => ({ id: m.id, name: m.name })), cells }
}

export const nameOf = (m: StatsModel, id: string): string => m.members.find((x) => x.id === id)?.name ?? "Unknown"
const cellsOf = (m: StatsModel, id: string): Cell[] => m.cells[id] ?? m.sems.map(() => null)

/** The group's win rate (0..1) in semester k: everyone's wins over everyone's noms. Null when nobody had nominations. */
export function groupRate(m: StatsModel, k: number): number | null {
    let w = 0
    let n = 0
    for (const row of Object.values(m.cells)) {
        const c = row[k]
        if (c) {
            w += c.wins
            n += c.noms
        }
    }
    return n > 0 ? w / n : null
}
export const groupRates = (m: StatsModel): (number | null)[] => m.sems.map((_, k) => groupRate(m, k))

export type Totals = { wins: number; noms: number; sem: number; rate: number | null; approx: boolean }
/** Totals over every semester, or only semester k. approx: some counted semester came from slides. */
export function totals(m: StatsModel, id: string, k: number | null = null): Totals {
    let wins = 0
    let noms = 0
    let sem = 0
    let approx = false
    cellsOf(m, id).forEach((c, i) => {
        if (!c || (k !== null && i !== k)) return
        wins += c.wins
        noms += c.noms
        sem++
        if (m.sems[i].approx) approx = true
    })
    return { wins, noms, sem, rate: rate(wins, noms), approx }
}

/** Per-semester win rates (percent) for one member; null where they were not in. */
export const rateSeries = (m: StatsModel, id: string): (number | null)[] => cellsOf(m, id).map((c) => (c ? rate(c.wins, c.noms) : null))

export type ExpectedRow = { k: number; actual: number; expected: number; diff: number }
export type Verdict = "over" | "under" | "par"
export const verdictOf = (diff: number): Verdict => (diff >= PAR_BAND ? "over" : diff <= -PAR_BAND ? "under" : "par")
export const VERDICT_LABEL: Record<Verdict, string> = { over: "Over performing", under: "Under performing", par: "On par" }

/** Expected wins = noms x the group's win rate that semester, summed over the semesters the member was in. */
export function expectedWins(m: StatsModel, id: string): { actual: number; expected: number; diff: number; verdict: Verdict; perSem: (ExpectedRow | null)[] } {
    const g = groupRates(m)
    let actual = 0
    let expected = 0
    const perSem = cellsOf(m, id).map((c, k) => {
        const gr = g[k]
        if (!c || gr === null) return null
        const e = c.noms * gr
        actual += c.wins
        expected += e
        return { k, actual: c.wins, expected: e, diff: c.wins - e }
    })
    const diff = actual - expected
    return { actual, expected, diff, verdict: verdictOf(diff), perSem }
}

export type Placement = { rank: number; tied: boolean; n: number; top: number }
/** Rank among everyone with a value (higher is better); ties share the better rank. Top X% = ceil(rank / n x 100). Null when this member has no value. */
export function placement(values: Record<string, number>, id: string): Placement | null {
    const v = values[id]
    if (v === undefined) return null
    const all = Object.values(values)
    const rank = 1 + all.filter((o) => o > v).length
    const n = all.length
    return { rank, tied: all.filter((o) => o === v).length > 1, n, top: Math.ceil((rank / n) * 100) }
}

export type MetricKey = "wins" | "noms" | "rate"
/**
 * One number per member who has data in scope (k, or all time), for ranking.
 * rate needs MIN_RATE_NOMS_ALL (MIN_RATE_NOMS_SEM in one semester) noms so a 2-of-3 semester cannot top the board.
 * perSem (all time only): wins and noms become averages per semester played.
 */
export function metricValues(m: StatsModel, key: MetricKey, o: { k?: number | null; perSem?: boolean } = {}): Record<string, number> {
    const k = o.k ?? null
    const out: Record<string, number> = {}
    for (const { id } of m.members) {
        const t = totals(m, id, k)
        if (t.noms === 0) continue
        if (key === "rate") {
            if (t.noms >= (k === null ? MIN_RATE_NOMS_ALL : MIN_RATE_NOMS_SEM) && t.rate !== null) out[id] = t.rate
        } else {
            const v = t[key]
            out[id] = o.perSem && k === null ? v / t.sem : v
        }
    }
    return out
}

/** Average per semester played (wins and noms). Null when never in a semester. */
export function perSemesterAverage(m: StatsModel, id: string): { wins: number; noms: number; sem: number } | null {
    const t = totals(m, id)
    return t.sem > 0 ? { wins: t.wins / t.sem, noms: t.noms / t.sem, sem: t.sem } : null
}

export type SortKey = MetricKey
export type Entry = {
    id: string
    name: string
    wins: number
    noms: number
    rate: number | null
    sem: number
    approx: boolean
    /** Averages per semester played (all time). */
    avgWins: number
    avgNoms: number
    /** No nominations in scope: listed last, no rank. */
    none: boolean
    /** Win % sort only: too few noms to rank. */
    low: boolean
    rank: number | null
    tied: boolean
}

/**
 * Leaderboard rows. Scope: a semester index (only members who were in it) or all time (everyone, no data last).
 * Win % ranks only members with enough nominations; the rest are listed unranked. Ties share a rank.
 */
export function leaderboardEntries(m: StatsModel, o: { k: number | null; sort: SortKey; perSem?: boolean }): Entry[] {
    const { k, sort } = o
    const perSem = Boolean(o.perSem) && k === null
    const minN = k === null ? MIN_RATE_NOMS_ALL : MIN_RATE_NOMS_SEM
    const out: Entry[] = []
    for (const { id, name } of m.members) {
        const t = totals(m, id, k)
        if (k !== null && t.sem === 0) continue
        out.push({
            id,
            name,
            wins: t.wins,
            noms: t.noms,
            rate: t.rate,
            sem: t.sem,
            approx: t.approx,
            avgWins: t.sem ? t.wins / t.sem : 0,
            avgNoms: t.sem ? t.noms / t.sem : 0,
            none: t.noms === 0,
            low: t.noms > 0 && t.noms < minN,
            rank: null,
            tied: false,
        })
    }
    const key = (e: Entry): [number, number] =>
        sort === "wins" ? [perSem ? e.avgWins : e.wins, e.rate ?? 0] : sort === "noms" ? [perSem ? e.avgNoms : e.noms, e.wins] : [e.rate ?? -1, e.wins]
    const ranked = (e: Entry) => !e.none && !(sort === "rate" && e.low)
    out.sort((a, b) => {
        if (a.none !== b.none) return a.none ? 1 : -1
        if (sort === "rate" && a.low !== b.low) return a.low ? 1 : -1
        const A = key(a)
        const B = key(b)
        return B[0] - A[0] || B[1] - A[1] || a.name.localeCompare(b.name)
    })
    const pool = out.filter(ranked)
    for (const e of out) {
        if (!ranked(e)) continue
        const kk = key(e)
        const eq = (o2: Entry) => key(o2)[0] === kk[0] && key(o2)[1] === kk[1]
        e.rank = 1 + pool.filter((o2) => key(o2)[0] > kk[0] || (key(o2)[0] === kk[0] && key(o2)[1] > kk[1])).length
        e.tied = pool.some((o2) => o2 !== e && eq(o2))
    }
    return out
}

export type Compare = {
    series: { a: number | null; b: number | null }[]
    /** Semesters both were in. */
    shared: number
    aEdge: number
    bEdge: number
    /** null when they share fewer than 2 semesters (no head to head). */
    verdict: "a" | "b" | "even" | null
}
/** Per-semester win rates side by side. The edge only counts semesters both were in. */
export function compareMembers(m: StatsModel, a: string, b: string): Compare {
    const sa = rateSeries(m, a)
    const sb = rateSeries(m, b)
    let shared = 0
    let aEdge = 0
    let bEdge = 0
    sa.forEach((x, k) => {
        const y = sb[k]
        if (x === null || y === null) return
        shared++
        if (x > y) aEdge++
        else if (y > x) bEdge++
    })
    return {
        series: sa.map((x, k) => ({ a: x, b: sb[k] })),
        shared,
        aEdge,
        bEdge,
        verdict: shared < 2 ? null : aEdge > bEdge ? "a" : bEdge > aEdge ? "b" : "even",
    }
}

/** A member with no nominations anywhere has nothing to chart yet. */
export const hasStats = (m: StatsModel, id: string): boolean => totals(m, id).noms > 0
