import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Lock, Medal, Swords } from "lucide-react"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { useMemberPebble } from "../../ui/useMemberPebble"
import { Sparkline } from "../../ui/charts/StatsCharts"
import { Switch } from "../../ui/Switch"
import { Button } from "../../ui/Button"
import { EmptyState } from "../../ui/EmptyState"
import { APPROX_LABELS, APPROX_MARK, MIN_RATE_NOMS_ALL, MIN_RATE_NOMS_SEM, fmtRate, leaderboardEntries, rateSeries, type Entry, type SortKey, type StatsModel } from "../../lib/statsLab"
import { CompareSheet } from "./CompareSheet"

const SORTS: { value: SortKey; label: string }[] = [
    { value: "wins", label: "Wins" },
    { value: "noms", label: "Noms" },
    { value: "rate", label: "Win %" },
]
const NOTE = "text-footnote text-label-2"
const CHIP = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-subhead font-bold cursor-pointer transition-colors"
const chip = (on: boolean) => `${CHIP} ${on ? "bg-inverse text-on-inverse" : "bg-fill text-label-2"}`
// Podium: flat gold / silver-blue / bronze, 2-1-3 order.
const BLOCK = [
    { height: 100, box: "bg-gold text-on-gold", face: 72 as const, order: "order-2" },
    { height: 76, box: "bg-silver text-on-silver", face: 56 as const, order: "order-1" },
    { height: 58, box: "bg-bronze text-on-bronze", face: 56 as const, order: "order-3" },
]
const rankText = (e: Entry) => (e.rank === null ? "·" : `${e.tied ? "T" : ""}${e.rank}`)
const rankSr = (e: Entry) => (e.rank === null ? "Not ranked" : `${e.tied ? "Tied " : ""}rank ${e.rank}`)

const memberPath = (id: string) => `/app/results/members/${id}`

type Fmt = { main: string; wins: string; noms: string; rate: string }
function formatEntry(e: Entry, sort: SortKey, perSem: boolean): Fmt {
    const t = e.approx ? APPROX_MARK : ""
    const wins = e.none ? "—" : perSem ? e.avgWins.toFixed(1) : String(e.wins)
    const noms = e.none ? "—" : `${t}${perSem ? e.avgNoms.toFixed(1) : e.noms}`
    const rate = e.none ? "—" : `${t}${fmtRate(e.rate, 0)}`
    const unit = perSem ? " per semester" : ""
    const main = sort === "wins" ? `${wins} ${e.wins === 1 && !perSem ? "win" : "wins"}${unit}` : sort === "noms" ? `${noms} noms${unit}` : rate
    return { main, wins, noms, rate }
}

/**
 * The shared leaderboard: sort chips, All time / semester picker, a podium for the top 3, then the rest with a small win-rate trend.
 * Past semesters are public. The live season is a chip (and in the totals) only once its results are released; before that it is a locked slot.
 */
export function Leaderboard({ model, pendingLabel, viewerId }: { model: StatsModel; pendingLabel: string | null; viewerId: string | null }) {
    const pebbleOf = useMemberPebble()
    const [sort, setSort] = useState<SortKey>("wins")
    const [scope, setScope] = useState<number | null>(null)
    const [perSemRaw, setPerSem] = useState(false)
    const [compare, setCompare] = useState(false)
    const perSem = perSemRaw && scope === null && sort !== "rate"
    const entries = useMemo(() => leaderboardEntries(model, { k: scope, sort, perSem }), [model, scope, sort, perSem])
    const ranked = entries.filter((e) => e.rank !== null)
    const podium = ranked.length >= 3 ? ranked.slice(0, 3) : []
    const rest = entries.filter((e) => !podium.includes(e))
    const absent = scope === null ? [] : model.members.filter((m) => !entries.some((e) => e.id === m.id)).map((m) => m.name)
    const anyApprox = entries.some((e) => e.approx && !e.none)
    const minN = scope === null ? MIN_RATE_NOMS_ALL : MIN_RATE_NOMS_SEM
    const compareIds = useMemo(() => leaderboardEntries(model, { k: null, sort: "wins" }).filter((e) => !e.none).map((e) => e.id), [model])
    const scopeName = scope === null ? "All time" : model.sems[scope].label
    const footnote = anyApprox && (
        <p className={`mt-2 ${NOTE}`}>
            {APPROX_MARK} = counted from slides ({APPROX_LABELS.join(", ")}), so noms and win % run a little low.
        </p>
    )

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="space-y-4">
                <div className="space-y-3 rounded-card bg-surface p-4">
                    <div>
                        <p className="mb-1 text-caption-1 uppercase tracking-wider text-label-2">Sort by</p>
                        <div role="group" aria-label="Sort by" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                            {SORTS.map((s) => (
                                <button key={s.value} type="button" aria-pressed={sort === s.value} onClick={() => setSort(s.value)} className={chip(sort === s.value)}>{s.label}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="mb-1 text-caption-1 uppercase tracking-wider text-label-2">Season</p>
                        <div role="group" aria-label="Season" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                            <button type="button" aria-pressed={scope === null} onClick={() => setScope(null)} className={chip(scope === null)}>All time</button>
                            {model.sems.map((s, k) => (
                                <button key={s.label} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={chip(scope === k)}>{s.label}</button>
                            ))}
                            {pendingLabel && (
                                <button type="button" disabled aria-disabled="true" title="Locked until results are released" className={`${CHIP} cursor-default border-2 border-dashed border-surface-2 text-label-3`}>
                                    <Lock aria-hidden className="size-4" />
                                    {pendingLabel}
                                </button>
                            )}
                        </div>
                        {pendingLabel && <p className={`mt-1 ${NOTE}`}>{pendingLabel} appears here once results are released.</p>}
                    </div>
                    {scope === null && sort !== "rate" && (
                        <div className="flex items-center justify-between gap-3 border-t border-sep pt-3">
                            <span className="min-w-0">
                                <span className="block text-subhead font-bold">Per semester played</span>
                                <span className={NOTE}>Ranks by the average, so newer members aren't behind.</span>
                            </span>
                            <Switch label="Per semester played" checked={perSemRaw} onChange={setPerSem} />
                        </div>
                    )}
                </div>

                {entries.length === 0 ? (
                    <EmptyState icon={Medal} title="No one here yet" body="Nobody has nominations in this season." />
                ) : podium.length === 3 ? (
                    <section aria-label={`Podium, ${scopeName}`} className="rounded-card bg-surface p-4">
                        <ol className="m-0 flex list-none items-end justify-center gap-3 p-0">
                            {podium.map((e, i) => {
                                const b = BLOCK[i]
                                const f = formatEntry(e, sort, perSem)
                                return (
                                    <li key={e.id} className={`min-w-0 max-w-32 flex-1 text-center ${b.order}`}>
                                        <Link to={memberPath(e.id)} className="block rounded-control focus-visible:outline-2 focus-visible:outline-accent">
                                            <span className="flex justify-center"><MemberAvatar memberId={e.id} name={e.name} size={b.face} ring="pebble" decorative /></span>
                                            <span className="mt-1.5 block break-words text-callout font-bold"><span className="sr-only">{rankSr(e)}: </span>{e.name}</span>
                                            <span className="block text-caption-1 text-label-2">{f.main}</span>
                                        </Link>
                                        <div aria-hidden className={`mt-2 flex items-start justify-center rounded-t-control pt-2 font-display text-title-1 ${b.box}`} style={{ height: b.height }}>{rankText(e)}</div>
                                    </li>
                                )
                            })}
                        </ol>
                    </section>
                ) : (
                    <p className={NOTE}>The podium needs at least 3 ranked members.</p>
                )}
                {entries.length > 1 && (
                    <Button variant="secondary" size="md" fullWidth icon={<Swords aria-hidden className="size-4" />} onClick={() => setCompare(true)}>Compare two members</Button>
                )}
                {rest.length === 0 && footnote}
            </div>

            {rest.length > 0 && (
                <section aria-label={`Leaderboard, ${scopeName}`} className="rounded-card bg-surface p-4">
                    <div aria-hidden className="mb-1 flex justify-end gap-0.5 text-caption-2 uppercase text-label-3">
                        <span className="w-12 text-center">Wins</span>
                        <span className="w-12 text-center">Noms</span>
                        <span className="w-12 text-center">Win %</span>
                    </div>
                    <ol start={podium.length + 1} className="m-0 list-none divide-y divide-sep p-0">
                        {rest.map((e) => {
                            const f = formatEntry(e, sort, perSem)
                            const me = e.id === viewerId
                            const series = rateSeries(model, e.id)
                            const col = (s: SortKey) => (sort === s ? "text-accent" : "")
                            return (
                                <li key={e.id}>
                                    <Link to={memberPath(e.id)} className={`flex min-h-14 items-center gap-2.5 rounded-control px-2 py-1.5 hover:bg-fill focus-visible:outline-2 focus-visible:outline-accent ${me ? "bg-fill outline outline-2 outline-accent" : ""}`}>
                                        <span className="w-6 shrink-0 text-center text-subhead font-bold text-label-2"><span aria-hidden>{rankText(e)}</span><span className="sr-only">{rankSr(e)}: </span></span>
                                        <MemberAvatar memberId={e.id} name={e.name} size={40} ring="pebble" decorative />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5 text-subhead font-bold">
                                                <span className="break-words">{e.name}</span>
                                                {me && <span className="rounded-full bg-inverse px-1.5 text-caption-2 font-bold text-on-inverse">You</span>}
                                                {e.low && sort === "rate" && <span className="rounded-full bg-surface-2 px-1.5 text-caption-2 font-bold">few noms</span>}
                                            </span>
                                            <span className="mt-0.5 flex items-center text-caption-2 text-label-2">
                                                {e.none ? "No data yet" : <Sparkline series={series} pebble={pebbleOf(e.id, e.name)} label={`Win rate by semester: ${series.map((v) => fmtRate(v, 0)).join(", ")}`} />}
                                            </span>
                                        </span>
                                        <span aria-hidden className="flex shrink-0 gap-0.5 text-subhead font-bold tabular-nums">
                                            <span className={`w-12 text-center ${col("wins")}`}>{f.wins}</span>
                                            <span className={`w-12 text-center ${col("noms")}`}>{f.noms}</span>
                                            <span className={`w-12 text-center ${col("rate")}`}>{f.rate}</span>
                                        </span>
                                        <span className="sr-only">{e.none ? "No nominations yet" : `${f.wins} wins, ${f.noms} noms, ${f.rate} win rate`}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ol>
                    {absent.length > 0 && <p className={`mt-3 ${NOTE}`}>Not in this semester: {absent.join(", ")}.</p>}
                    {sort === "rate" && <p className={`mt-2 ${NOTE}`}>Win % ranks need {minN}+ noms. Others are listed without a rank.</p>}
                    {footnote}
                </section>
            )}
            <CompareSheet open={compare} onClose={() => setCompare(false)} model={model} ranked={compareIds} viewerId={viewerId} />
        </div>
    )
}
