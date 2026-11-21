import { useMemo, useState, type ReactNode } from "react"
import { Activity, Crown, Lock, TrendingUp } from "lucide-react"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { useMemberPebble } from "../../ui/useMemberPebble"
import { PEBBLE_CLASS, PEBBLE_TEXT } from "../../ui/logic/pebble"
import { DotStrip, ExpectedChart, NomsWinsChart, TrendChart } from "../../ui/charts/StatsCharts"
import { ordinal } from "../../lib/resultsView"
import {
    APPROX_MARK, MIN_RATE_NOMS_ALL, bestWorst, consistency, crowns, expectedWins, fmtRate, groupRates, hasStats, metricValues, nameOf, placement,
    rateSeries, streaks, totals, VERDICT_LABEL, type MetricKey, type StatsModel,
} from "../../lib/statsLab"
import { HowCalculatedSheet } from "./HowCalculatedSheet"

const NOTE = "text-footnote text-label-2"
const CARD = "rounded-card bg-surface p-4"
const PILL = { over: "bg-success text-bg", under: "bg-warn text-bg", par: "bg-inverse text-on-inverse" } as const

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
    return (
        <section data-stat-card className={`${CARD} flex h-full flex-col`}>
            <h3 className="line-clamp-1 text-title-3">{title}</h3>
            <p className={`mt-1 line-clamp-3 min-h-[3.75rem] ${NOTE}`}>{sub ?? " "}</p>
            <div className="mt-3 min-h-64 flex-1">{children}</div>
        </section>
    )
}

const Swatch = ({ className }: { className: string }) => <span aria-hidden className={`mr-1.5 inline-block size-2.5 rounded-sm align-middle ${className}`} />
const Legend = ({ children }: { children: ReactNode }) => <p className={`mb-2 flex flex-wrap gap-x-4 gap-y-1 ${NOTE}`}>{children}</p>

const approx = (on: boolean) => (on ? APPROX_MARK : "")

/**
 * One member's stats: totals with rank, then the charts. Used for "My stats" on You and, read-only, for any member from the leaderboard.
 * `viewer` false = looking at someone else (copy talks about them).
 */
export function MemberStats({ model, memberId, viewer = true, pendingLabel }: { model: StatsModel; memberId: string; viewer?: boolean; pendingLabel: string | null }) {
    const pebbleOf = useMemberPebble()
    const [how, setHow] = useState(false)
    const name = nameOf(model, memberId)
    const pebble = pebbleOf(memberId, name)
    const you = viewer ? "you" : name
    const t = totals(model, memberId)
    const names = useMemo(() => Object.fromEntries(model.members.map((m) => [m.id, m.name])), [model])

    if (!hasStats(model, memberId)) {
        return (
            <section className="rounded-card border-2 border-dashed border-surface-2 p-6 text-center">
                <div className="flex justify-center"><MemberAvatar memberId={memberId} name={name} size={56} ring="pebble" decorative /></div>
                <h3 className="mt-3 text-title-3">Not enough data yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-callout text-label-2">
                    {viewer ? "You have" : `${name} has`} no nominations in the seasons we have on file. Stats start once this season's results are released.
                </p>
                <p className="mt-3 inline-block rounded-full bg-inverse px-3 py-1 text-footnote font-bold text-on-inverse">Needs 1 semester with nominations</p>
                {pendingLabel && <LockedNote label={pendingLabel} />}
            </section>
        )
    }

    const place = (key: MetricKey) => placement(metricValues(model, key), memberId)
    const rankText = (key: MetricKey) => {
        const p = place(key)
        return p ? `${p.tied ? "T-" : ""}#${p.rank} of ${p.n}` : "Not ranked"
    }
    const first = model.sems[0].label
    const last = model.sems.at(-1)!.label
    const series = rateSeries(model, memberId)
    const group = groupRates(model).map((g) => (g === null ? null : g * 100))
    const exp = expectedWins(model, memberId)
    const bw = bestWorst(model, memberId)
    const st = streaks(model, memberId)
    const cons = consistency(model, memberId)
    const cr = crowns(model, memberId)
    const lowRate = t.noms < MIN_RATE_NOMS_ALL
    const tiles: { label: string; value: string; rank: string }[] = [
        { label: "Wins", value: String(t.wins), rank: rankText("wins") },
        { label: "Noms", value: `${approx(t.approx)}${t.noms}`, rank: rankText("noms") },
        { label: "Win rate", value: `${approx(t.approx)}${fmtRate(t.rate)}`, rank: lowRate ? "Not ranked" : rankText("rate") },
    ]
    const semName = (k: number) => model.sems[k].label
    const cards: { key: MetricKey; label: string; fmt: (v: number) => string }[] = [
        { key: "wins", label: "Wins", fmt: (v) => `${Math.round(v)} wins` },
        { key: "noms", label: "Noms", fmt: (v) => `${Math.round(v)} noms` },
        { key: "rate", label: "Win rate", fmt: (v) => fmtRate(v) },
    ]

    return (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
                <div className="grid grid-cols-3 gap-2">
                    {tiles.map((x) => (
                        <div key={x.label} role="group" aria-label={x.label} className="rounded-card bg-surface p-3">
                            <p className="text-caption-1 uppercase tracking-wider text-label-2">{x.label}</p>
                            <p className="font-display text-title-1 tabular-nums">{x.value}</p>
                            <p className={`text-caption-1 font-bold ${PEBBLE_TEXT[pebble]}`}>{x.rank}</p>
                        </div>
                    ))}
                </div>
                <p className={`mt-2 ${NOTE}`}>
                    {first} to {last} · in {t.sem} of {model.sems.length} semesters
                    {model.sems.some((s) => s.approx) ? ` · ${APPROX_MARK} = counted from slides, so noms are a bit low` : ""}
                </p>
            </div>

            <Card title="Noms vs wins, by semester" sub="Light bar = times nominated. Color bar = times won.">
                <Legend>
                    <span><Swatch className="bg-label-3" />Noms</span>
                    <span><Swatch className={PEBBLE_CLASS[pebble].bg} />Wins</span>
                </Legend>
                <NomsWinsChart sems={model.sems} cells={model.cells[memberId]} pebble={pebble} name={name} />
            </Card>

            <Card title="Win rate trend" sub={`Wins divided by noms each semester, against the whole group.`}>
                {t.sem >= 2 ? (
                    <>
                        <Legend>
                            <span><Swatch className={PEBBLE_CLASS[pebble].bg} />{name}</span>
                            <span><span aria-hidden className="mr-1.5 inline-block w-4 border-t-2 border-dashed border-label-2 align-middle" />Group average</span>
                        </Legend>
                        <TrendChart sems={model.sems} series={series} group={group} pebble={pebble} name={name} />
                        {t.sem < model.sems.length && <p className={`mt-1 ${NOTE}`}>Dashes mean {viewer ? "you were" : `${name} was`} not in that semester. The line never bridges a gap.</p>}
                    </>
                ) : (
                    <p className="py-6 text-callout text-label-2">Needs at least 2 semesters to draw a trend.</p>
                )}
            </Card>

            <Card title="Expected vs actual wins" sub="Expected = noms x the group's win rate that semester: with this many shots, how many would an average member have won?">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex h-7 items-center rounded-full px-3 text-footnote font-bold ${PILL[exp.verdict]}`}>{VERDICT_LABEL[exp.verdict]}</span>
                    <span className="text-callout">
                        <b>{exp.actual}</b> won vs <b>{exp.expected.toFixed(1)}</b> expected ({exp.diff > 0 ? "+" : ""}{exp.diff.toFixed(1)})
                    </span>
                </div>
                <Legend>
                    <span><Swatch className={PEBBLE_CLASS[pebble].bg} />Actual wins</span>
                    <span><span aria-hidden className="mr-1.5 inline-block w-4 border-t-[3px] border-label align-middle" />Expected</span>
                </Legend>
                <ExpectedChart sems={model.sems} rows={exp.perSem} pebble={pebble} name={name} />
            </Card>

            <Card title={viewer ? "Where you stand" : `Where ${name} stands`} sub={`Everyone's dot on one line. ${viewer ? "You are" : `${name} is`} the big ringed one.`}>
                <div className="space-y-4">
                    {cards.map((c) => {
                        const values = metricValues(model, c.key)
                        const p = placement(values, memberId)
                        return (
                            <div key={c.key}>
                                <p className="text-caption-1 uppercase tracking-wider text-label-2">{c.label}</p>
                                {!p ? (
                                    <p className={`mt-1 ${NOTE}`}>Not ranked yet{c.key === "rate" ? ` (needs at least ${MIN_RATE_NOMS_ALL} nominations)` : ""}</p>
                                ) : (
                                    <>
                                        <p className="font-display text-title-2">
                                            Top {p.top}% <span className="font-sans text-callout font-normal text-label-2">{`— ${p.tied ? "T-" : ""}${ordinal(p.rank)} of ${p.n}`}</span>
                                        </p>
                                        <DotStrip values={values} meId={memberId} pebble={pebble} fmt={c.fmt} label={c.label} names={names} />
                                        <p className={NOTE}>
                                            {approx(t.approx && c.key !== "wins")}{c.fmt(values[memberId])}{c.key !== "rate" ? ` · in ${t.sem} of ${model.sems.length} semesters` : ""}
                                        </p>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </Card>

            <div className="flex flex-col lg:col-span-2">
                <Card title="Highlights">
                    {bw ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-control bg-bg p-3">
                                <p className="text-caption-1 uppercase tracking-wider text-label-2">Best semester</p>
                                <p className="text-headline text-success">{semName(bw.best.k)}</p>
                                <p className={NOTE}>{fmtRate(bw.best.rate)} · {bw.best.wins} of {bw.best.noms}</p>
                            </div>
                            <div className="rounded-control bg-bg p-3">
                                <p className="text-caption-1 uppercase tracking-wider text-label-2">Roughest semester</p>
                                <p className="text-headline text-warn">{semName(bw.worst.k)}</p>
                                <p className={NOTE}>{fmtRate(bw.worst.rate)} · {bw.worst.wins} of {bw.worst.noms}</p>
                            </div>
                        </div>
                    ) : (
                        <p className={NOTE}>Best and roughest semester need at least 2 semesters with 5+ noms.</p>
                    )}
                    <ul className="mt-2 list-none divide-y divide-sep p-0">
                        {st && (
                            <Callout icon={<TrendingUp aria-hidden className="size-4" />}>
                                <b>{st.current ? `${st.current} semester${st.current > 1 ? "s" : ""} in a row` : "Not currently"} at or above the group average.</b>
                                <span className="block text-label-2">Longest run: {st.longest}. Semesters {you === "you" ? "you were" : "they were"} not in are skipped, not counted as a break.</span>
                            </Callout>
                        )}
                        {cons && (
                            <Callout icon={<Activity aria-hidden className="size-4" />}>
                                <b>{cons.label}.</b> {viewer ? "Your" : "Their"} win rate moves about {Math.round(cons.sd)} points between semesters.
                            </Callout>
                        )}
                        <Callout icon={<Crown aria-hidden className="size-4" />}>
                            <b>{cr} semester crown{cr === 1 ? "" : "s"}.</b> <span className="text-label-2">Semesters where nobody had more wins than {viewer ? "you" : "them"} (ties count).</span>
                        </Callout>
                    </ul>
                </Card>
            </div>

            {pendingLabel && (
                <div className="lg:col-span-2">
                    <LockedNote label={pendingLabel} />
                </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 lg:col-span-2">
                <button type="button" onClick={() => setHow(true)} className="min-h-11 text-subhead font-bold text-accent underline underline-offset-4">How these are calculated</button>
            </div>
            <HowCalculatedSheet open={how} onClose={() => setHow(false)} />
        </div>
    )
}

const Callout = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
    <li className="flex items-start gap-3 py-3 text-callout">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg">{icon}</span>
        <span className="min-w-0">{children}</span>
    </li>
)

function LockedNote({ label }: { label: string }) {
    return (
        <p className="mt-3 flex items-start gap-3 rounded-card border-2 border-dashed border-surface-2 p-3 text-left text-callout">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-pebble-lemon" />
            <span>
                <b>{label} is locked.</b> <span className="text-label-2">Its nominations and wins stay hidden until results are released. Totals do not include it yet.</span>
            </span>
        </p>
    )
}
