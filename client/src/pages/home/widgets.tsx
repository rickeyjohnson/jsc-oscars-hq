import { useId, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Mail, Sparkles } from "lucide-react"
import { Avatar } from "../../ui/Avatar"
import { AvatarStack } from "../../ui/AvatarStack"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { Countdown } from "../../ui/Countdown"
import { SUBMIT_ENABLED } from "../../ui/copy"
import { ErrorState } from "../../ui/ErrorState"
import { Podium } from "../../ui/Podium"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { attentionItems } from "../../ui/logic/attention"
import { ballotCardStatus, pendingBallots, type BallotSummary } from "../../lib/voting"
import { DEFAULT_CEREMONY_MINUTES, buildIcs, downloadIcs, icsFileName } from "../../ui/logic/ics"
import { buttonClasses } from "../../ui/logic/variants"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"
import { WIDGETS, type WidgetId } from "../../ui/logic/homeWidgets"
import { buildResultCards } from "../../lib/resultsView"
import { leaderboard } from "../../lib/leaderboard"
import { nomineeStats } from "../../lib/stats"
import { closesInLabel, urgency } from "../../lib/time"
import type { Nominee } from "../../types"
import type { PebbleName } from "../../ui/tokens"
import { ceremonyDate, ceremonyTime, mapsUrl } from "./format"
import type { HomeState } from "./useHomeData"

type Status = "loading" | "ready" | "error"

const titleOf = (id: WidgetId) => WIDGETS.find((w) => w.id === id)?.title ?? id

/** A real region with its own heading, skeleton and error: one widget failing never blanks the others. */
function Widget({ id, status, retry, pebble, bare, children }: { id: WidgetId; status: Status; retry: () => void; pebble?: PebbleName; bare?: boolean; children: ReactNode }) {
    const hid = useId()
    const title = titleOf(id)
    const colored = pebble && status === "ready" && !bare
    const box = bare && status === "ready" ? "" : colored ? `rounded-card p-5 ${PEBBLE_CLASS[pebble].bg} ${PEBBLE_CLASS[pebble].text}` : "rounded-card bg-surface p-4"
    const heading = (
        <h2 id={hid} className={`text-caption-2 uppercase tracking-wider mb-2 ${colored ? "" : "text-label-2"}`}>
            {title}
        </h2>
    )
    return (
        <section aria-labelledby={hid} className={box}>
            {heading}
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

type Props = { state: HomeState; now: Date }

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
        <Widget id="ceremony" status={baseStatus(state)} retry={state.reload} pebble="lemon">
            <p className="text-title-1 font-display">{at ? `${ceremonyDate(at)} · ${ceremonyTime(at)}` : "Date coming soon"}</p>
            {season?.location && (
                <p className="mt-1 text-subhead font-bold">
                    <span aria-hidden>📍 </span>
                    <span className="sr-only">Location: </span>
                    {season.location}
                </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="md" disabled={!at} onClick={add} aria-describedby={at ? undefined : noteId}>
                    Add to calendar
                </Button>
                {season?.location && (
                    <a href={mapsUrl(season.location)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", size: "md" })}>
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
    const p = PEBBLE_CLASS.grape
    return (
        <li className={`rounded-card p-5 ${p.bg} ${p.text}`}>
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-title-2 min-w-0">{ballot.name}</h3>
                <Chip tone={urgent ? "warn" : "neutral"}>{closesInLabel(closes, now)}</Chip>
            </div>
            <div aria-hidden className="mt-3 flex gap-0.5">
                {Array.from({ length: ballot.category_count }, (_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < ballot.my_vote_count ? "bg-current" : "bg-strip-off"}`} />
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-subhead font-bold">{left} left</span>
                <Button size="md" to={`/app/ballots/${ballot.id}`} aria-label={`Continue ${ballot.name}`}>
                    Continue
                </Button>
            </div>
        </li>
    )
}

function Pending({ state, now }: Props) {
    const pending = state.data ? pendingBallots(state.data.summaries, now) : []
    const ready = state.data ? state.data.summaries.filter((b) => b.category_count > 0 && b.my_vote_count >= b.category_count && ballotCardStatus(b, b.category_count, b.my_vote_count, now) === "open") : []
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
            <Countdown target={at ? new Date(at) : null} />
        </Widget>
    )
}

function Progress({ state, now }: Props) {
    const open = (state.data?.summaries ?? []).filter((b) => b.category_count > 0 && ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "closed" && ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "upcoming")
    const voted = open.reduce((n, b) => n + b.my_vote_count, 0)
    const total = open.reduce((n, b) => n + b.category_count, 0)
    const done = open.filter((b) => b.my_vote_count >= b.category_count).length
    return (
        <Widget id="progress" status={baseStatus(state)} retry={state.reload} pebble="sky">
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
            <Widget id="latestWinners" status="ready" retry={state.reload} pebble="lemon">
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
                <p className="text-callout text-label-2">No winners yet.</p>
            ) : (
                <ul className="list-none p-0 space-y-3">
                    {cards.map((c) => {
                        const w = c.podium.find((p) => p.slot === 1)
                        return (
                            <li key={c.category_id} className="flex items-center gap-3">
                                <Avatar id={w?.nominee_id ?? c.category_id} name={w?.name ?? c.name} src={w?.memberIds[0] ? avatars[w.memberIds[0]] : null} size={40} ring="gold" decorative />
                                <div className="min-w-0">
                                    <p className="text-footnote text-label-2 truncate">{c.name}</p>
                                    <p className="text-headline truncate">{w?.name ?? "To be decided"}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            <Link to="/app/results" className="mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-bold text-accent">
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
                <p className="text-callout text-label-2">No wins to rank yet.</p>
            ) : (
                <Podium
                    variant="card"
                    items={rows.map((r, i) => ({ key: r.member_id, slot: (i + 1) as 1 | 2 | 3, name: r.name, sub: `${r.wins} ${r.wins === 1 ? "win" : "wins"}`, avatarUrl: dir?.avatars[r.member_id] ?? null }))}
                />
            )}
            <Link to="/app/results" className="mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-bold text-accent">
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
        <Widget id="attention" status={status} retry={state.reload} pebble={warn ? "cherry" : undefined}>
            {top ? (
                <>
                    <p className="text-title-2">{top.label}</p>
                    {items.length > 1 && <p className="mt-1 text-footnote">+{items.length - 1} more to look at</p>}
                    <div className="mt-3">
                        <Button size="md" to={top.to}>
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
    return (
        <Widget id="notVoted" status={status} retry={state.reload}>
            {!c ? (
                <p className="text-callout text-label-2">There's no open main ballot right now.</p>
            ) : behind.length === 0 ? (
                <p className="text-callout text-label-2">Everyone has finished voting.</p>
            ) : (
                <>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <AvatarStack people={behind.map((m) => ({ id: m.name, name: m.name }))} max={5} size={24} />
                        <Chip>
                            {behind.length} of {c.members.length}
                        </Chip>
                    </div>
                    <ul className="list-none p-0 space-y-2">
                        {behind.slice(0, 5).map((m) => (
                            <li key={m.name} className="flex items-center gap-3">
                                <Avatar id={m.name} name={m.name} size={24} decorative />
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
                <Link to={`/app/profile/ballots/${c.ballot.id}`} className="mt-3 inline-flex min-h-11 items-center gap-1 text-subhead font-bold text-accent">
                    Open ballot admin <ChevronRight aria-hidden className="size-4" />
                </Link>
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
    progress: (p) => <Progress {...p} />,
    latestWinners: (p) => <LatestWinners {...p} />,
    leaderboardPeek: (p) => <LeaderboardPeek {...p} />,
    notVoted: (p) => <NotVoted {...p} />,
    attention: (p) => <Attention {...p} />,
    quickActions: (p) => <QuickActions {...p} />,
}

export function HomeWidget({ id, state, now }: { id: WidgetId } & Props) {
    return <>{RENDER[id]({ state, now })}</>
}
