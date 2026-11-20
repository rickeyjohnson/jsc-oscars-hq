import { useEffect, useId, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Mail, Sparkles } from "lucide-react"
import { Avatar } from "../../ui/Avatar"
import { AvatarStack } from "../../ui/AvatarStack"
import { Button } from "../../ui/Button"
import { Countdown } from "../../ui/Countdown"
import { SUBMIT_ENABLED } from "../../ui/copy"
import { ErrorState } from "../../ui/ErrorState"
import { Podium } from "../../ui/Podium"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { attentionItems } from "../../ui/logic/attention"
import { ballotCardStatus, pendingBallots, type BallotSummary } from "../../lib/voting"
import { DEFAULT_CEREMONY_MINUTES, buildIcs, downloadIcs, icsFileName } from "../../ui/logic/ics"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"
import { WIDGETS, widgetColor, type WidgetId } from "../../ui/logic/homeWidgets"
import { buildResultCards } from "../../lib/resultsView"
import { leaderboard } from "../../lib/leaderboard"
import { nomineeStats } from "../../lib/stats"
import { closesInLabel, countdownParts, urgency } from "../../lib/time"
import type { Nominee } from "../../types"
import { ceremonyDate, ceremonyTime, mapsUrl } from "./format"
import type { HomeState } from "./useHomeData"

type Status = "loading" | "ready" | "error"

const titleOf = (id: WidgetId) => WIDGETS.find((w) => w.id === id)?.title ?? id

const LINK_ON_COLOR = "mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-bold underline"
const LINK_PLAIN = "mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-bold text-accent"
const PILL = "secondary" as const
/** A small dark chip that stays readable on any pebble color. */
const InkChip = ({ children }: { children: ReactNode }) => (
    <span className="inline-flex h-6 items-center rounded-full bg-bg px-2.5 text-caption-1 font-bold text-label whitespace-nowrap">{children}</span>
)

/** A real region with its own heading, skeleton and error: one widget failing never blanks the others. Color comes from the registry. */
function Widget({ id, status, retry, bare, plain, children }: { id: WidgetId; status: Status; retry: () => void; bare?: boolean; plain?: boolean; children: ReactNode }) {
    const hid = useId()
    const title = titleOf(id)
    const color = widgetColor(id)
    const ready = status === "ready"
    const colored = color !== "ink" && ready && !bare && !plain
    const box = bare && ready ? "" : colored ? `rounded-card p-5 ${PEBBLE_CLASS[color].bg} ${PEBBLE_CLASS[color].text}` : color === "ink" && ready ? "rounded-card bg-elevated p-4 text-label" : "rounded-card bg-surface p-4"
    // Grape is large-text-only (ink on grape is 4.38:1), so its heading is bigger and not tiny caps.
    const headCls = color === "grape" && colored ? "text-headline mb-2" : `text-caption-2 uppercase tracking-wider mb-2 ${colored ? "" : "text-label-2"}`
    return (
        <section aria-labelledby={hid} className={box}>
            <h2 id={hid} className={headCls}>
                {title}
            </h2>
            {status === "loading" ? (
                <SkeletonScreen label={`Loading ${title}`}>
                    <div className="space-y-2">
                        <Skeleton shape="line" width="60%" />
                        <Skeleton shape="block" />
                    </div>
                </SkeletonScreen>
            ) : status === "error" ? (
                <ErrorState title={`Couldn't load ${title}`} body="Check your connection and try again." onRetry={retry} />
            ) : (
                children
            )}
        </section>
    )
}

type Props = { state: HomeState; now: Date; memberId?: string }

const baseStatus = (s: HomeState): Status => (s.data ? "ready" : s.error ? "error" : "loading")

function Ceremony({ state }: Props) {
    const season = state.data?.season ?? null
    const at = season?.ceremony_at ? new Date(season.ceremony_at) : null
    const noteId = useId()
    const add = () => {
        if (!season || !at) return
        const title = season.name || "JSC Oscars"
        const text = buildIcs({ uid: `${season.id}@jsc-oscars`, title, start: at, durationMinutes: DEFAULT_CEREMONY_MINUTES, location: season.location, now: new Date() })
        downloadIcs(icsFileName(title), text)
    }
    return (
        <Widget id="ceremony" status={baseStatus(state)} retry={state.reload}>
            <p className="text-title-1 font-display">{at ? `${ceremonyDate(at)} · ${ceremonyTime(at)}` : "Date coming soon"}</p>
            {season?.location && (
                <p className="mt-1 text-subhead font-bold">
                    <span aria-hidden>📍 </span>
                    <span className="sr-only">Location: </span>
                    {season.location}
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant={PILL} size="md" disabled={!at} onClick={add} aria-describedby={at ? undefined : noteId}>
                    Add to calendar
                </Button>
                {season?.location && (
                    <a href={mapsUrl(season.location)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full border-2 border-current px-5 text-subhead font-bold">
                        Directions
                    </a>
                )}
            </div>
            {!at && (
                <p id={noteId} className="mt-2 text-footnote">
                    The ceremony date isn't set yet, so there's nothing to add to your calendar.
                </p>
            )}
        </Widget>
    )
}

function PendingBallot({ ballot, now }: { ballot: BallotSummary; now: Date }) {
    const closes = new Date(ballot.closes_at)
    const urgent = urgency(closes, now) === "urgent"
    const left = ballot.category_count - ballot.my_vote_count
    const p = PEBBLE_CLASS.lime
    return (
        <li className={`rounded-card p-5 ${p.bg} ${p.text}`}>
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-title-2 min-w-0">{ballot.name}</h3>
                <InkChip>{urgent ? "Closing soon · " : ""}{closesInLabel(closes, now)}</InkChip>
            </div>
            <div aria-hidden className="mt-3 flex gap-0.5">
                {Array.from({ length: ballot.category_count }, (_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full bg-current ${i < ballot.my_vote_count ? "" : "opacity-25"}`} />
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-subhead font-bold">{left} left</span>
                <Button variant={PILL} size="md" to={`/app/ballots/${ballot.id}`} aria-label={`Continue ${ballot.name}`}>
                    Continue
                </Button>
            </div>
        </li>
    )
}

function Pending({ state, now }: Props) {
    const pending = state.data ? pendingBallots(state.data.summaries, now) : []
    const ready = state.data ? state.data.summaries.filter((b) => b.category_count > 0 && b.my_vote_count >= 1 && ballotCardStatus(b, b.category_count, b.my_vote_count, now) === "open") : []
    return (
        <Widget id="pending" status={baseStatus(state)} retry={state.reload} bare={pending.length > 0}>
            {pending.length > 0 ? (
                <ul className="space-y-3 list-none p-0">
                    {pending.map((b) => (
                        <PendingBallot key={b.id} ballot={b} now={now} />
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-start gap-3">
                    <p className="text-title-3">You're all caught up.</p>
                    <Link to="/app/ballots" className="inline-flex min-h-11 items-center gap-1 text-subhead font-bold text-accent">
                        See your ballots <ChevronRight aria-hidden className="size-4" />
                    </Link>
                </div>
            )}
            {SUBMIT_ENABLED &&
                ready.map((b) => (
                    <Link key={b.id} to={`/app/ballots/${b.id}/submit`} className="mt-2 inline-flex min-h-11 items-center text-subhead font-bold text-accent">
                        Submit {b.name}
                    </Link>
                ))}
        </Widget>
    )
}

function CountdownWidget({ state }: Props) {
    const at = state.data?.season?.ceremony_at
    return (
        <Widget id="countdown" status={baseStatus(state)} retry={state.reload}>
            <Countdown target={at ? new Date(at) : null} onColor />
        </Widget>
    )
}

function Progress({ state, now }: Props) {
    const open = (state.data?.summaries ?? []).filter((b) => b.category_count > 0 && ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "closed" && ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "upcoming")
    const voted = open.reduce((n, b) => n + b.my_vote_count, 0)
    const total = open.reduce((n, b) => n + b.category_count, 0)
    const done = open.filter((b) => b.my_vote_count >= b.category_count).length
    return (
        <Widget id="progress" status={baseStatus(state)} retry={state.reload}>
            {total === 0 ? (
                <p className="text-title-3">No open ballots right now.</p>
            ) : (
                <>
                    <p className="text-caption-2 uppercase tracking-wider">Your votes</p>
                    <p className="text-title-1 font-display tabular-nums">
                        {voted} / {total}
                    </p>
                    <p className="mt-1 text-footnote">
                        {done} of {open.length} {open.length === 1 ? "ballot" : "ballots"} complete
                    </p>
                </>
            )}
        </Widget>
    )
}

const resultsStatus = (s: HomeState): Status => (s.data?.errors.results ? "error" : s.data?.results ? "ready" : baseStatus(s))

function LatestWinners({ state }: Props) {
    const d = state.data
    const avatars = state.directory?.avatars ?? {}
    if (d && !d.released) {
        return (
            <Widget id="latestWinners" status="ready" retry={state.reload}>
                <div className="flex items-center gap-3">
                    <Mail aria-hidden className="size-8 shrink-0" />
                    <p className="text-title-3">The envelope opens on Oscar night</p>
                </div>
            </Widget>
        )
    }
    const cards = d?.results ? buildResultCards(d.results.categories, d.results.results).filter((c) => !c.pending).slice(-3).reverse() : []
    return (
        <Widget id="latestWinners" status={resultsStatus(state)} retry={state.reload}>
            {cards.length === 0 ? (
                <p className="text-callout">No winners yet.</p>
            ) : (
                <ul className="list-none p-0 space-y-3">
                    {cards.map((c) => {
                        const w = c.podium.find((p) => p.slot === 1)
                        const person = w?.memberIds[0] ?? w?.name ?? c.category_id
                        return (
                            <li key={c.category_id} className="flex items-center gap-3">
                                <Avatar id={person} name={w?.name ?? c.name} src={w?.memberIds[0] ? avatars[w.memberIds[0]] : null} size={40} ring="pebble" decorative />
                                <div className="min-w-0">
                                    <p className="text-footnote truncate">{c.name}</p>
                                    <p className="text-headline truncate">{w?.name ?? "To be decided"}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            <Link to="/app/results" className={LINK_ON_COLOR}>
                See all results <ChevronRight aria-hidden className="size-4" />
            </Link>
        </Widget>
    )
}

function LeaderboardPeek({ state }: Props) {
    const d = state.data
    const dir = state.directory
    const status: Status = d?.errors.results ? "error" : d?.results && dir ? "ready" : baseStatus(state) === "error" ? "error" : "loading"
    let rows: ReturnType<typeof leaderboard> = []
    if (d?.results && dir) {
        const nominees: Record<string, Nominee> = {}
        for (const c of d.results.categories) for (const n of c.nominees) nominees[n.id] = n
        rows = leaderboard(nomineeStats(Object.values(d.results.results), nominees).members, dir.members)
            .filter((r) => r.wins > 0)
            .slice(0, 3)
    }
    return (
        <Widget id="leaderboardPeek" status={status} retry={state.reload}>
            {rows.length === 0 ? (
                <p className="text-callout">No wins to rank yet.</p>
            ) : (
                <Podium
                    variant="card"
                    items={rows.map((r, i) => ({ key: r.member_id, slot: (i + 1) as 1 | 2 | 3, name: r.name, sub: `${r.wins} ${r.wins === 1 ? "win" : "wins"}`, avatarUrl: dir?.avatars[r.member_id] ?? null }))}
                    onColor
                    faceRing="pebble"
                />
            )}
            <Link to="/app/results" className={LINK_ON_COLOR}>
                See the full leaderboard <ChevronRight aria-hidden className="size-4" />
            </Link>
        </Widget>
    )
}

function Attention({ state, now }: Props) {
    const d = state.data
    const status: Status = d?.errors.committee ? "error" : d && !d.released && !d.ballots && d.season ? "loading" : baseStatus(state)
    const items = d && status === "ready" ? attentionItems({ ballots: d.ballots ?? [], checks: d.checks, released: d.released, now }) : []
    const top = items[0]
    const warn = top?.tone === "warn"
    return (
        <Widget id="attention" status={status} retry={state.reload} plain={!warn}>
            {top ? (
                <>
                    <p className="text-title-2">{top.label}</p>
                    {items.length > 1 && <p className="mt-1 text-footnote">+{items.length - 1} more to look at</p>}
                    <div className="mt-3">
                        <Button variant={warn ? PILL : "primary"} size="md" to={top.to}>
                            {top.id === "ready" ? "Open the envelope" : top.id === "ties" ? "Go to tally" : "Review"}
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-callout text-label-2">Nothing needs your attention. </p>
            )}
        </Widget>
    )
}

function NotVoted({ state }: Props) {
    const d = state.data
    const status: Status = d?.errors.completion ? "error" : baseStatus(state)
    const c = d?.completion
    const behind = c ? c.members.filter((m) => m.voted < m.total).sort((a, b) => a.voted - b.voted || a.name.localeCompare(b.name)) : []
    // Grape allows large text only, so the detail sits on a dark panel inside the card.
    return (
        <Widget id="notVoted" status={status} retry={state.reload}>
            {c && behind.length > 0 && (
                <div className="mb-3">
                    <InkChip>
                        {behind.length} of {c.members.length}
                    </InkChip>
                </div>
            )}
            <div className="rounded-control bg-bg p-3 text-label">
                {!c ? (
                    <p className="text-callout">There's no open main ballot right now.</p>
                ) : behind.length === 0 ? (
                    <p className="text-callout">Everyone has finished voting.</p>
                ) : (
                    <>
                        <div className="mb-3">
                            <AvatarStack people={behind.map((m) => ({ id: m.name, name: m.name }))} max={5} size={24} ring="pebble" />
                        </div>
                        <ul className="list-none p-0 space-y-2">
                            {behind.slice(0, 5).map((m) => (
                                <li key={m.name} className="flex items-center gap-3">
                                    <Avatar id={m.name} name={m.name} size={24} ring="pebble" decorative />
                                    <span className="flex-1 min-w-0 truncate text-subhead">{m.name}</span>
                                    <span className="text-footnote text-label-2 tabular-nums">
                                        {m.voted} of {m.total}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                {c && (
                    <Link to={`/app/profile/ballots/${c.ballot.id}`} className={LINK_PLAIN}>
                        Open ballot admin <ChevronRight aria-hidden className="size-4" />
                    </Link>
                )}
            </div>
        </Widget>
    )
}

/** Ticks every second; shows d/h/m/s to `target`. */
function LiveTimer({ target }: { target: Date }) {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])
    const p = countdownParts(target, now)
    if (!p) return <p className="text-title-1 font-display">Closed</p>
    const pad = (n: number) => String(n).padStart(2, "0")
    const label = `${p.days}d ${p.hours}h ${p.minutes}m`
    return (
        <p role="timer" aria-live="off" aria-label={`Closes in ${label}`} className="flex items-baseline gap-2 font-display tabular-nums">
            <span className="text-title-1">{label}</span>
            <span className="text-title-3">{pad(p.seconds)}</span>
        </p>
    )
}

function BallotCloses({ state, now }: Props) {
    const open = (state.data?.summaries ?? [])
        .filter((b) => ["open", "voted"].includes(ballotCardStatus(b, b.category_count, b.my_vote_count, now)))
        .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())[0]
    return (
        <Widget id="ballotCloses" status={baseStatus(state)} retry={state.reload}>
            {open ? (
                <>
                    <p className="text-footnote truncate">{open.name}</p>
                    <LiveTimer target={new Date(open.closes_at)} />
                    <div className="mt-3">
                        <Button variant={PILL} size="md" to={`/app/ballots/${open.id}`} aria-label={`Open ${open.name}`}>
                            Open ballot
                        </Button>
                    </div>
                </>
            ) : (
                <p className="text-title-3">No ballots are open.</p>
            )}
        </Widget>
    )
}

function YourStats({ state, memberId }: Props) {
    const d = state.data
    let tally = { wins: 0, noms: 0 }
    if (d?.results && memberId) {
        const nominees: Record<string, Nominee> = {}
        for (const c of d.results.categories) for (const n of c.nominees) nominees[n.id] = n
        tally = nomineeStats(Object.values(d.results.results), nominees).members[memberId] ?? tally
    }
    const rate = tally.noms > 0 ? Math.round((tally.wins / tally.noms) * 100) : 0
    return (
        <Widget id="yourStats" status={resultsStatus(state)} retry={state.reload}>
            {!memberId ? (
                <p className="text-callout">Claim your name to see your stats.</p>
            ) : (
                <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                        ["Wins", String(tally.wins)],
                        ["Nominations", String(tally.noms)],
                        ["Win rate", `${rate}%`],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <dd className="text-title-1 font-display tabular-nums">{v}</dd>
                            <dt className="text-footnote">{k}</dt>
                        </div>
                    ))}
                </dl>
            )}
        </Widget>
    )
}

function BallotHealth({ state }: Props) {
    const d = state.data
    const status: Status = d?.errors.completion ? "error" : baseStatus(state)
    const c = d?.completion
    const votesIn = c ? c.members.reduce((n, m) => n + m.voted, 0) : 0
    const possible = c ? c.members.reduce((n, m) => n + m.total, 0) : 0
    const complete = c ? c.members.filter((m) => m.voted >= m.total).length : 0
    return (
        <Widget id="ballotHealth" status={status} retry={state.reload}>
            {!c ? (
                <p className="text-callout">There's no open main ballot right now.</p>
            ) : (
                <>
                    <p className="text-title-1 font-display tabular-nums">
                        {votesIn} / {possible}
                    </p>
                    <p className="text-footnote">votes in</p>
                    <p className="mt-1 text-footnote">
                        {complete} of {c.members.length} members complete
                    </p>
                </>
            )}
        </Widget>
    )
}

function Tiebreak({ state, now }: Props) {
    const rounds = (state.data?.summaries ?? []).filter((b) => b.round === "tiebreak" && b.status === "open" && new Date(b.closes_at).getTime() > now.getTime())
    const left = rounds.reduce((n, b) => n + b.category_count, 0)
    return (
        <Widget id="tiebreak" status={baseStatus(state)} retry={state.reload}>
            {rounds.length === 0 ? (
                <p className="text-callout">No tiebreak rounds are open.</p>
            ) : (
                <>
                    <p className="text-title-1 font-display tabular-nums">{rounds.length}</p>
                    <p className="text-footnote">open {rounds.length === 1 ? "round" : "rounds"}</p>
                    <p className="mt-1 text-footnote">
                        {left} {left === 1 ? "category" : "categories"} left
                    </p>
                </>
            )}
            <Link to="/app/profile/ballots" className={LINK_ON_COLOR}>
                Manage ballots <ChevronRight aria-hidden className="size-4" />
            </Link>
        </Widget>
    )
}

function RevealReadiness({ state }: Props) {
    const d = state.data
    const status: Status = d?.errors.committee ? "error" : d && !d.released && !d.checks && d.season ? "loading" : baseStatus(state)
    const checks = d?.checks ?? []
    const ok = checks.filter((c) => c.ok).length
    const todo = checks.filter((c) => !c.ok)
    return (
        <Widget id="revealReadiness" status={status} retry={state.reload}>
            {d?.released ? (
                <p className="text-title-3">The envelope is open.</p>
            ) : (
                <>
                    <p className="text-title-1 font-display tabular-nums">
                        {ok} / {checks.length}
                    </p>
                    <p className="text-footnote">checks ready</p>
                    {todo.slice(0, 2).map((c) => (
                        <p key={c.id} className="mt-1 text-footnote">
                            {c.label}
                        </p>
                    ))}
                    <div className="mt-3">
                        <Button variant={PILL} size="md" to="/app/profile/release">
                            {todo.length === 0 ? "Open the envelope" : "Release checklist"}
                        </Button>
                    </div>
                </>
            )}
        </Widget>
    )
}

function QuickActions({ state }: Props) {
    return (
        <Widget id="quickActions" status={baseStatus(state)} retry={state.reload}>
            <div className="flex flex-wrap gap-2">
                <Button variant="tinted" size="md" to="/app/profile/ballots/create">
                    New ballot
                </Button>
                <Button variant="tinted" size="md" to="/app/profile/ballots">
                    Manage ballots
                </Button>
                <Button variant="tinted" size="md" to="/app/profile/members">
                    Members
                </Button>
                <Button variant="tinted" size="md" to="/app/profile/release" icon={<Sparkles aria-hidden className="size-4" />}>
                    The envelope
                </Button>
            </div>
        </Widget>
    )
}

const RENDER: Record<WidgetId, (p: Props) => ReactNode> = {
    ceremony: (p) => <Ceremony {...p} />,
    countdown: (p) => <CountdownWidget {...p} />,
    pending: (p) => <Pending {...p} />,
    ballotCloses: (p) => <BallotCloses {...p} />,
    progress: (p) => <Progress {...p} />,
    yourStats: (p) => <YourStats {...p} />,
    ballotHealth: (p) => <BallotHealth {...p} />,
    tiebreak: (p) => <Tiebreak {...p} />,
    revealReadiness: (p) => <RevealReadiness {...p} />,
    latestWinners: (p) => <LatestWinners {...p} />,
    leaderboardPeek: (p) => <LeaderboardPeek {...p} />,
    notVoted: (p) => <NotVoted {...p} />,
    attention: (p) => <Attention {...p} />,
    quickActions: (p) => <QuickActions {...p} />,
}

export function HomeWidget({ id, ...props }: { id: WidgetId } & Props) {
    return <>{RENDER[id](props)}</>
}
