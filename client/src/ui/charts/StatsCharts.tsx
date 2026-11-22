import type { ReactNode } from "react"
import { PEBBLE_FILL, PEBBLE_STROKE } from "../logic/pebble"
import { colX, niceMax, polyPoints, runs, stripLayout, ticks } from "../logic/chartGeom"
import { APPROX_MARK, fmtRate, VERDICT_LABEL, verdictOf, type Cell, type ExpectedRow, type Sem } from "../../lib/statsLab"
import type { PebbleName } from "../tokens"

// Hand-built SVG charts. Colors come only from tokens (Tailwind fill-/stroke- classes); a member's series uses their fixed pebble.
// Every chart is a role="img" with a one-sentence summary, plus a visually hidden table of the same numbers.

const W = 320
const DASH = "—"
const VERDICT_FILL = { over: "fill-success", under: "fill-warn", par: "fill-label" } as const

export type ChartTable = { caption: string; head: string[]; rows: string[][] }

function Chart({ h, summary, table, children }: { h: number; summary: string; table: ChartTable; children: ReactNode }) {
    return (
        <figure className="relative m-0">
            <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label={summary} className="mx-auto block h-auto w-full max-w-[560px]">
                {children}
            </svg>
            {/* A bare <table className="sr-only"> ignores width/overflow (tables size to content), so it escaped the card and widened the page on phones. */}
            <div className="sr-only">
            <table>
                <caption>{table.caption}</caption>
                <thead>
                    <tr>
                        {table.head.map((c) => (
                            <th key={c} scope="col">{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((r) => (
                        <tr key={r[0]}>
                            {r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </figure>
    )
}

function Grid({ values, y, left, fmt = String }: { values: number[]; y: (v: number) => number; left: number; fmt?: (v: number) => string }) {
    return (
        <>
            {values.map((v) => (
                <g key={v}>
                    <line x1={left} x2={W - 4} y1={y(v)} y2={y(v)} className="stroke-sep" strokeWidth={1} />
                    <text x={left - 5} y={y(v) + 3.5} fontSize={10} textAnchor="end" className="fill-label-2">{fmt(v)}</text>
                </g>
            ))}
        </>
    )
}

const SemLabel = ({ x, y, text, dim }: { x: number; y: number; text: string; dim?: boolean }) => (
    <text x={x} y={y} fontSize={10.5} textAnchor="middle" className={dim ? "fill-label-3" : "fill-label-2"}>{text}</text>
)
const Gap = ({ x, y }: { x: number; y: number }) => (
    <text x={x} y={y} fontSize={13} textAnchor="middle" className="fill-label-3">{DASH}</text>
)

const noms = (c: Cell, s: Sem) => (c ? `${s.approx ? APPROX_MARK : ""}${c.noms}` : DASH)

/** Noms (light bar) next to wins (the member's pebble) for every semester. A semester not in shows a dash. */
export function NomsWinsChart({ sems, cells, pebble, name }: { sems: Sem[]; cells: Cell[]; pebble: PebbleName; name: string }) {
    const H = 190, pl = 26, pr = 6, pt = 16, pb = 26
    const n = sems.length
    const gw = (W - pl - pr) / n
    const bw = Math.min(16, gw * 0.34)
    const mx = niceMax(Math.max(0, ...cells.map((c) => c?.noms ?? 0)), 5)
    const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx)
    const summary = `${name}: nominations and wins in each of ${n} semesters. ` + sems.map((s, i) => `${s.label} ${cells[i] ? `${noms(cells[i], s)} noms, ${cells[i]!.wins} wins` : "not in"}`).join("; ") + "."
    return (
        <Chart h={H} summary={summary} table={{ caption: `${name}: nominations and wins by semester`, head: ["Semester", "Noms", "Wins"], rows: sems.map((s, i) => [s.label, noms(cells[i], s), cells[i] ? String(cells[i]!.wins) : DASH]) }}>
            <Grid values={ticks(mx)} y={y} left={pl} />
            {sems.map((s, i) => {
                const c = cells[i]
                const cx = colX(i, n, pl, W - pl - pr)
                return (
                    <g key={s.label}>
                        {!c ? (
                            <Gap x={cx} y={y(0) - 8} />
                        ) : (
                            <>
                                <rect x={cx - bw - 1} y={y(c.noms)} width={bw} height={y(0) - y(c.noms)} rx={3} className={s.approx ? "fill-fill stroke-label-2" : "fill-label-3"} strokeDasharray={s.approx ? "3 2" : undefined} />
                                <rect x={cx + 1} y={y(c.wins)} width={bw} height={Math.max(2, y(0) - y(c.wins))} rx={3} className={PEBBLE_FILL[pebble]} />
                                <text x={cx - bw / 2 - 1} y={y(c.noms) - 4} fontSize={10} textAnchor="middle" className="fill-label-2">{noms(c, s)}</text>
                                <text x={cx + bw / 2 + 1} y={y(c.wins) - 4} fontSize={10} fontWeight={700} textAnchor="middle" className={PEBBLE_FILL[pebble]}>{c.wins}</text>
                            </>
                        )}
                        <SemLabel x={cx} y={H - 8} text={s.short} dim={!c} />
                    </g>
                )
            })}
        </Chart>
    )
}

/** Win rate per semester against the dashed group average. Gaps are dashes and the line never bridges them. */
export function TrendChart({ sems, series, group, pebble, name }: { sems: Sem[]; series: (number | null)[]; group: (number | null)[]; pebble: PebbleName; name: string }) {
    const H = 180, pl = 30, pr = 10, pt = 14, pb = 24
    const n = sems.length
    const x = (i: number) => colX(i, n, pl, W - pl - pr)
    const mx = niceMax(Math.max(0, ...group.filter((v): v is number => v !== null), ...series.filter((v): v is number => v !== null)), 20)
    const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx)
    const summary = `${name}: win rate in each semester against the group average. ` + sems.map((s, i) => `${s.label} ${fmtRate(series[i], 0)}, group ${fmtRate(group[i], 0)}`).join("; ") + "."
    return (
        <Chart h={H} summary={summary} table={{ caption: `${name}: win rate by semester`, head: ["Semester", `${name} win rate`, "Group win rate"], rows: sems.map((s, i) => [s.label, fmtRate(series[i], 1), fmtRate(group[i], 1)]) }}>
            <Grid values={ticks(mx, mx / 20)} y={y} left={pl} fmt={(v) => `${v}%`} />
            {runs(group).map((r) => (
                <polyline key={r[0][0]} fill="none" className="stroke-label-2" strokeWidth={1.8} strokeDasharray="5 4" points={polyPoints(r, x, y)} />
            ))}
            {runs(series).map((r) => r.length > 1 && <polyline key={r[0][0]} fill="none" className={PEBBLE_STROKE[pebble]} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" points={polyPoints(r, x, y)} />)}
            {sems.map((s, i) => {
                const v = series[i]
                return (
                    <g key={s.label}>
                        {v === null ? (
                            <Gap x={x(i)} y={y(0) - 6} />
                        ) : (
                            <>
                                <circle cx={x(i)} cy={y(v)} r={4.5} className={`${PEBBLE_FILL[pebble]} stroke-surface`} strokeWidth={2} />
                                <text x={x(i)} y={y(v) - 9} fontSize={10} fontWeight={700} textAnchor="middle" className={PEBBLE_FILL[pebble]}>{Math.round(v)}</text>
                            </>
                        )}
                        <SemLabel x={x(i)} y={H - 7} text={s.short} dim={v === null} />
                    </g>
                )
            })}
        </Chart>
    )
}

const signed = (d: number) => `${d > 0 ? "+" : ""}${d.toFixed(1)}`

/** Actual wins (bar) against expected wins (tick). The label over each is actual minus expected: green over, orange under. */
export function ExpectedChart({ sems, rows, pebble, name }: { sems: Sem[]; rows: (ExpectedRow | null)[]; pebble: PebbleName; name: string }) {
    const H = 170, pl = 26, pr = 6, pt = 22, pb = 24
    const n = sems.length
    const gw = (W - pl - pr) / n
    const bw = Math.min(26, gw * 0.5)
    const mx = niceMax(Math.max(0, ...rows.map((r) => (r ? Math.max(r.actual, r.expected) : 0))) + 0.5, 2)
    const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx)
    const summary = `${name}: actual wins against expected wins in each semester. ` + sems.map((s, i) => `${s.label} ${rows[i] ? `${rows[i]!.actual} won, ${rows[i]!.expected.toFixed(1)} expected, ${VERDICT_LABEL[verdictOf(rows[i]!.diff)].toLowerCase()}` : "not in"}`).join("; ") + "."
    return (
        <Chart h={H} summary={summary} table={{ caption: `${name}: expected versus actual wins`, head: ["Semester", "Actual wins", "Expected wins", "Difference"], rows: sems.map((s, i) => [s.label, rows[i] ? String(rows[i]!.actual) : DASH, rows[i] ? rows[i]!.expected.toFixed(1) : DASH, rows[i] ? signed(rows[i]!.diff) : DASH]) }}>
            <Grid values={ticks(mx, mx / 2)} y={y} left={pl} />
            {sems.map((s, i) => {
                const r = rows[i]
                const cx = colX(i, n, pl, W - pl - pr)
                return (
                    <g key={s.label}>
                        {!r ? (
                            <Gap x={cx} y={y(0) - 8} />
                        ) : (
                            <>
                                <rect x={cx - bw / 2} y={y(r.actual)} width={bw} height={Math.max(2, y(0) - y(r.actual))} rx={4} className={PEBBLE_FILL[pebble]} />
                                <line x1={cx - bw / 2 - 5} x2={cx + bw / 2 + 5} y1={y(r.expected)} y2={y(r.expected)} className="stroke-label" strokeWidth={2.5} />
                                <path d={`M${cx} ${y(r.expected) - 4}l4 4-4 4-4-4z`} className="fill-surface stroke-label" strokeWidth={1.5} />
                                <text x={cx} y={Math.min(y(r.actual), y(r.expected)) - 9} fontSize={10} fontWeight={700} textAnchor="middle" className={VERDICT_FILL[verdictOf(r.diff)]}>{signed(r.diff)}</text>
                            </>
                        )}
                        <SemLabel x={cx} y={H - 7} text={s.short} dim={!r} />
                    </g>
                )
            })}
        </Chart>
    )
}

/** Everyone's dot on one line, low to high. This member is the big ringed dot in their pebble. */
export function DotStrip({ values, meId, pebble, fmt, label, names }: { values: Record<string, number>; meId: string; pebble: PebbleName; fmt: (v: number) => string; label: string; names: Record<string, string> }) {
    const H = 44, p = 10, line = 30, span = W - 2 * p
    const layout = stripLayout(values, span)
    const vs = Object.values(values)
    const lo = Math.min(...vs)
    const hi = Math.max(...vs)
    const me = layout.find((d) => d.id === meId)
    const summary = `${label}: ${names[meId] ?? "this member"} at ${fmt(values[meId])} among ${vs.length} members, from ${fmt(lo)} to ${fmt(hi)}.`
    const sorted = [...layout].reverse()
    return (
        <Chart h={H} summary={summary} table={{ caption: `${label} for every ranked member`, head: ["Member", label], rows: sorted.map((d) => [names[d.id] ?? d.id, fmt(values[d.id])]) }}>
            <line x1={p} x2={W - p} y1={line} y2={line} className="stroke-strip-off" strokeWidth={2} />
            {layout.filter((d) => d.id !== meId).map((d) => (
                <circle key={d.id} cx={p + d.x * span} cy={24 - d.row * 8} r={3.6} className="fill-label-3" />
            ))}
            {me && <circle cx={p + me.x * span} cy={24 - me.row * 8} r={6.5} className={`${PEBBLE_FILL[pebble]} stroke-label`} strokeWidth={2.5} />}
            <text x={p} y={H - 1} fontSize={10} className="fill-label-2">{fmt(lo)}</text>
            <text x={W - p} y={H - 1} fontSize={10} textAnchor="end" className="fill-label-2">{fmt(hi)}</text>
        </Chart>
    )
}

/** Tiny win-rate trend for a leaderboard row. Same rules as the trend: gaps are not bridged; a lone point is a dot. */
export function Sparkline({ series, pebble, label, w = 72, h = 16 }: { series: (number | null)[]; pebble: PebbleName; label: string; w?: number; h?: number }) {
    const n = series.length
    const mx = Math.max(60, ...series.filter((v): v is number => v !== null))
    const x = (i: number) => 2 + (w - 4) * (n === 1 ? 0.5 : i / (n - 1))
    const y = (v: number) => h - 2 - ((h - 4) * v) / mx
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
            {runs(series).map((r) =>
                r.length > 1 ? (
                    <polyline key={r[0][0]} fill="none" className={PEBBLE_STROKE[pebble]} strokeWidth={1.8} strokeLinejoin="round" points={polyPoints(r, x, y)} />
                ) : (
                    <circle key={r[0][0]} cx={x(r[0][0])} cy={y(r[0][1])} r={1.8} className={PEBBLE_FILL[pebble]} />
                ),
            )}
        </svg>
    )
}

/** Two members' win rates side by side in each semester. A semester one of them was not in leaves that bar out. */
export function CompareChart({ sems, series, a, b }: { sems: Sem[]; series: { a: number | null; b: number | null }[]; a: { name: string; pebble: PebbleName }; b: { name: string; pebble: PebbleName } }) {
    const H = 190, pl = 30, pr = 6, pt = 18, pb = 26
    const n = sems.length
    const gw = (W - pl - pr) / n
    const bw = Math.min(14, gw * 0.38)
    const mx = niceMax(Math.max(0, ...series.flatMap((s) => [s.a ?? 0, s.b ?? 0])), 20)
    const y = (v: number) => pt + (H - pt - pb) * (1 - v / mx)
    const summary = `${a.name} against ${b.name}: win rate in each semester. ` + sems.map((s, i) => `${s.label} ${a.name} ${fmtRate(series[i].a, 0)}, ${b.name} ${fmtRate(series[i].b, 0)}`).join("; ") + "."
    return (
        <Chart h={H} summary={summary} table={{ caption: `${a.name} and ${b.name}: win rate by semester`, head: ["Semester", `${a.name} win rate`, `${b.name} win rate`], rows: sems.map((s, i) => [s.label, fmtRate(series[i].a, 1), fmtRate(series[i].b, 1)]) }}>
            <Grid values={ticks(mx, mx / 20)} y={y} left={pl} fmt={(v) => `${v}%`} />
            {sems.map((s, i) => {
                const cx = colX(i, n, pl, W - pl - pr)
                const { a: va, b: vb } = series[i]
                return (
                    <g key={s.label}>
                        {va === null && vb === null && <Gap x={cx} y={y(0) - 8} />}
                        {va !== null && (
                            <>
                                <rect x={cx - bw - 1} y={y(va)} width={bw} height={Math.max(1, y(0) - y(va))} rx={3} className={`${PEBBLE_FILL[a.pebble]} opacity-60`} />
                                <text x={cx - bw / 2 - 1} y={y(va) - 4} fontSize={9.5} textAnchor="middle" className="fill-label-2">{Math.round(va)}</text>
                            </>
                        )}
                        {vb !== null && (
                            <>
                                <rect x={cx + 1} y={y(vb)} width={bw} height={Math.max(1, y(0) - y(vb))} rx={3} className={`${PEBBLE_FILL[b.pebble]} stroke-surface`} strokeWidth={1.5} />
                                <text x={cx + bw / 2 + 1} y={y(vb) - 4} fontSize={9.5} fontWeight={700} textAnchor="middle" className="fill-label">{Math.round(vb)}</text>
                            </>
                        )}
                        <SemLabel x={cx} y={H - 8} text={s.short} dim={va === null && vb === null} />
                    </g>
                )
            })}
        </Chart>
    )
}
