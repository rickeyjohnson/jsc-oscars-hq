import { useEffect, useId, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"
import { Avatar } from "../../ui/Avatar"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { Countdown } from "../../ui/Countdown"
import { ErrorState } from "../../ui/ErrorState"
import { Podium } from "../../ui/Podium"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { noBallotNote } from "../../ui/logic/ballotsView"
import { attentionItems } from "../../ui/logic/attention"
import { ballotCardStatus, openBallotRows } from "../../lib/voting"
import { DEFAULT_CEREMONY_MINUTES, buildIcs, downloadIcs, icsFileName } from "../../ui/logic/ics"
import { WIDGETS, widgetColor, type WidgetId } from "../../ui/logic/homeWidgets"
import { buildResultCards } from "../../lib/resultsView"
import { leaderboard } from "../../lib/leaderboard"
import { nomineeStats } from "../../lib/stats"
import { closesShort, countdownParts, urgency } from "../../lib/time"
import type { Nominee } from "../../types"
import { PEBBLE_EDGE as EDGE } from "../../ui/logic/pebble"
import { ceremonyDate, ceremonyTime, mapsUrl } from "./format"
import type { HomeState } from "./useHomeData"

type Status = "loading" | "ready" | "error"

const titleOf = (id: WidgetId) => WIDGETS.find((w) => w.id === id)?.title ?? id

const STRETCH = "after:absolute after:inset-0 after:rounded-card after:content-['']"

/**
 * A real region with its own heading, skeleton and error: one widget failing never blanks the others.
 * Title + content only; when `to` is set the whole card is the link (a stretched link inside the heading).
 */
function Widget({ id, status, retry, to, children }: { id: WidgetId; status: Status; retry: () => void; to?: string; children: ReactNode }) {
    const hid = useId()
    const title = titleOf(id)
    const ready = status === "ready"
    return (
        <section aria-labelledby={hid} className={`@container relative min-w-0 break-words rounded-card border-l-4 bg-surface p-3 sm:p-4 ${EDGE[widgetColor(id)]}`}>
            <h2 id={hid} className="mb-2 text-caption-2 uppercase tracking-wider text-label-2">
                {to && ready ? (
                    <Link to={to} className={STRETCH}>
                        {title}
                    </Link>
                ) : (
                    title
                )}
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
    const ready = baseStatus(state) === "ready"
    return (
        <Widget id="ceremony" status={baseStatus(state)} retry={state.reload}>
            <p className="text-title-1 font-display">{at ? `${ceremonyDate(at)} · ${ceremonyTime(at)}` : "Date coming soon"}</p>
            {season?.location && (
                <p className="mt-1 text-subhead font-bold">
                    <span aria-hidden>📍 </span>
                    <span className="sr-only">Location: </span>
                    <a href={mapsUrl(season.location)} target="_blank" rel="noopener noreferrer" className="relative z-10 underline">
                        {season.location}
                        <span className="sr-only">, get directions</span>
                    </a>
                </p>
            )}
            {at ? <p className="mt-2 text-footnote text-label-2">Tap the card to add it to your calendar.</p> : (
                <p id={noteId} className="mt-2 text-footnote text-label-2">
                    The ceremony date isn't set yet, so there's nothing to add to your calendar.
                </p>
            )}
            {ready && (
                <button type="button" aria-label={at ? `Add to calendar, ${ceremonyDate(at)} at ${ceremonyTime(at)}` : "Add to calendar"} disabled={!at} aria-describedby={at ? undefined : noteId} onClick={add} className={`absolute inset-0 rounded-card ${at ? "cursor-pointer" : ""}`} />
            )}
        </Widget>
    )
}

function Pending({ state, now }: Props) {
    const rows = state.data ? openBallotRows(state.data.summaries, now) : []
    const MAX = 5
    return (
        <Widget id="pending" status={baseStatus(state)} retry={state.reload} to={rows.length === 0 ? "/app/ballots" : undefined}>
            {rows.length > 0 ? (
                <>
                    <ul className="list-none divide-y divide-sep p-0">
                        {rows.slice(0, MAX).map((b) => {
                            const all = b.category_count > 0 && b.my_vote_count >= b.category_count
                            const urgent = urgency(new Date(b.closes_at), now) === "urgent"
                            return (
                                <li key={b.id}>
                                    <Link to={`/app/ballots/${b.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-headline">{b.name}</span>
                                            <span className={`block text-footnote ${urgent ? "font-bold text-warn" : "text-label-2"}`}>{closesShort(new Date(b.closes_at), now)}</span>
                                        </span>
                                        <span className={`shrink-0 text-subhead tabular-nums ${all ? "font-bold" : "text-label-2"}`}>{all ? "All voted" : `${b.my_vote_count}/${b.category_count} voted`}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                    {rows.length > MAX && <p className="mt-1 text-footnote text-label-2">+{rows.length - MAX} more</p>}
                </>
            ) : state.data && state.data.summaries.every((b) => ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "open" && ballotCardStatus(b, b.category_count, b.my_vote_count, now) !== "voted") ? (
                <>
                    <p className="text-title-3">Nothing to vote on yet.</p>
                    <p className="mt-1 text-footnote text-label-2">{noBallotNote(state.data.summaries, now)}</p>
                </>
            ) : (
                <p className="text-title-3">You're all caught up.</p>
            )}
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
        <Widget id="progress" status={baseStatus(state)} retry={state.reload} to="/app/ballots">
            {total === 0 ? (
                <>
                    <p className="text-title-3">No open ballots right now.</p>
                    <p className="mt-1 text-footnote text-label-2">{noBallotNote(state.data?.summaries ?? [], now)}</p>
                </>
            ) : (
                <>
                    <p className="text-title-2 sm:text-title-1 font-display tabular-nums">
                        {voted} / {total}
                    </p>
                    <p className="mt-1 text-footnote text-label-2">
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
        <Widget id="latestWinners" status={resultsStatus(state)} retry={state.reload} to="/app/results">
            {cards.length === 0 ? (
                <p className="text-callout text-label-2">No winners yet. They show up here after the ceremony.</p>
            ) : (
                <ul className="list-none p-0 space-y-3">
                    {cards.map((c) => {
                        const w = c.podium.find((p) => p.slot === 1)
                        const person = w?.memberIds[0] ?? w?.name ?? c.category_id
                        return (
                            <li key={c.category_id} className="flex items-center gap-3">
                                <Avatar id={person} name={w?.name ?? c.name} src={w?.memberIds[0] ? avatars[w.memberIds[0]] : null} size={40} ring="pebble" decorative />
                                <div className="min-w-0">
                                    <p className="text-footnote text-label-2 truncate">{c.name}</p>
                                    <p className="text-headline truncate">{w?.name ?? "To be decided"}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
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
        <Widget id="leaderboardPeek" status={status} retry={state.reload} to="/app/results">
            {rows.length === 0 ? (
                <p className="text-callout text-label-2">No wins to rank yet.</p>
            ) : (
                <Podium
                    variant="card"
                    items={rows.map((r, i) => ({ key: r.member_id, slot: (i + 1) as 1 | 2 | 3, name: r.name, sub: `${r.wins} ${r.wins === 1 ? "win" : "wins"}`, avatarUrl: dir?.avatars[r.member_id] ?? null }))}
                    faceRing="pebble"
                />
            )}
        </Widget>
    )
}

function Attention({ state, now }: Props) {
    const d = state.data
    const status: Status = d?.errors.committee ? "error" : d && !d.released && !d.ballots && d.season ? "loading" : baseStatus(state)
    const items = d && status === "ready" ? attentionItems({ ballots: d.ballots ?? [], checks: d.checks, released: d.released, now }) : []
    const top = items[0]
    return (
        <Widget id="attention" status={status} retry={state.reload} to={top?.to}>
            {top ? (
                <>
                    <p className="text-title-2">{top.label}</p>
                    {items.length > 1 && <p className="mt-1 text-footnote text-label-2">+{items.length - 1} more to look at</p>}
                </>
            ) : (
                <p className="text-callout text-label-2">Nothing needs your attention.</p>
            )}
        </Widget>
    )
}

const MAX_FACES = 10

function Faces({ names, label }: { names: string[]; label: string }) {
    const shown = names.slice(0, MAX_FACES)
    const extra = names.length - shown.length
    return (
        <td className="align-top py-2 pr-2">
            {names.length === 0 ? (
                <span className="text-footnote text-label-2">Nobody</span>
            ) : (
                <ul aria-label={label} className="flex list-none flex-wrap gap-3 p-1">
                    {shown.map((n) => (
                        <li key={n}>
                            <MemberAvatar name={n} size={32} ring="pebble" />
                        </li>
                    ))}
                    {extra > 0 && <li className="self-center text-footnote font-bold text-label-2">+{extra}</li>}
                </ul>
            )}
        </td>
    )
}

function NotVoted({ state }: Props) {
    const d = state.data
    const status: Status = d?.errors.completion ? "error" : baseStatus(state)
    const c = d?.completion
    const done = c ? c.members.filter((m) => m.voted >= m.total).map((m) => m.name) : []
    const behind = c ? c.members.filter((m) => m.voted < m.total).map((m) => m.name) : []
    return (
        <Widget id="notVoted" status={status} retry={state.reload} to={c ? `/app/profile/ballots/${c.ballot.id}` : undefined}>
            {!c ? (
                <p className="text-callout text-label-2">There's no open main ballot right now.</p>
            ) : (
                <table className="w-full table-fixed border-collapse text-left">
                    <thead>
                        <tr>
                            <th scope="col" className="w-1/2 pb-1 text-footnote font-bold text-label-2">
                                Voted · {done.length}
                            </th>
                            <th scope="col" className="w-1/2 pb-1 text-footnote font-bold text-label-2">
                                Not yet · {behind.length}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Faces names={done} label="Voted" />
                            <Faces names={behind} label="Not yet" />
                        </tr>
                    </tbody>
                </table>
            )}
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
        <p role="timer" aria-live="off" aria-label={`Closes in ${label}`} className="flex flex-wrap items-baseline gap-x-2 font-display tabular-nums">
            <span className="text-title-2 sm:text-title-1">{label}</span>
            <span className="text-title-3 text-label-2">{pad(p.seconds)}</span>
        </p>
    )
}

function BallotCloses({ state, now }: Props) {
    const open = (state.data?.summaries ?? [])
        .filter((b) => ["open", "voted"].includes(ballotCardStatus(b, b.category_count, b.my_vote_count, now)))
        .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())[0]
    return (
        <Widget id="ballotCloses" status={baseStatus(state)} retry={state.reload} to={open ? `/app/ballots/${open.id}` : undefined}>
            {open ? <LiveTimer target={new Date(open.closes_at)} /> : <>
                    <p className="text-title-3">No ballots are open.</p>
                    <p className="mt-1 text-footnote text-label-2">{noBallotNote(state.data?.summaries ?? [], now)}</p>
                </>}
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
        <Widget id="yourStats" status={resultsStatus(state)} retry={state.reload} to="/app/results">
            {!memberId ? (
                <p className="text-callout text-label-2">Claim your name to see your stats.</p>
            ) : (
                <dl className="grid grid-cols-1 gap-1 text-center @[17rem]:grid-cols-3 @[17rem]:gap-2">
                    {[
                        ["Wins", String(tally.wins)],
                        ["Nominations", String(tally.noms)],
                        ["Win rate", `${rate}%`],
                    ].map(([k, v]) => (
                        <div key={k}>
                            <dd className="text-title-2 sm:text-title-1 font-display tabular-nums">{v}</dd>
                            <dt className="text-footnote text-label-2">{k}</dt>
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
        <Widget id="ballotHealth" status={status} retry={state.reload} to={c ? `/app/profile/ballots/${c.ballot.id}` : undefined}>
            {!c ? (
                <p className="text-callout text-label-2">There's no open main ballot right now.</p>
            ) : (
                <>
                    <p className="text-title-2 sm:text-title-1 font-display tabular-nums">
                        {votesIn} / {possible}
                    </p>
                    <p className="text-footnote text-label-2">votes in</p>
                    <p className="mt-1 text-footnote text-label-2">
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
        <Widget id="tiebreak" status={baseStatus(state)} retry={state.reload} to="/app/profile/ballots">
            {rounds.length === 0 ? (
                <p className="text-callout text-label-2">No tiebreak rounds are open.</p>
            ) : (
                <>
                    <p className="text-title-2 sm:text-title-1 font-display tabular-nums">{rounds.length}</p>
                    <p className="text-footnote text-label-2">open {rounds.length === 1 ? "round" : "rounds"}</p>
                    <p className="mt-1 text-footnote text-label-2">
                        {left} {left === 1 ? "category" : "categories"} left
                    </p>
                </>
            )}
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
        <Widget id="revealReadiness" status={status} retry={state.reload} to="/app/profile/release">
            {d?.released ? (
                <p className="text-title-3">The envelope is open.</p>
            ) : (
                <>
                    <p className="text-title-2 sm:text-title-1 font-display tabular-nums">
                        {ok} / {checks.length}
                    </p>
                    <p className="text-footnote text-label-2">checks ready</p>
                    {todo.slice(0, 2).map((c) => (
                        <p key={c.id} className="mt-1 text-footnote text-label-2">
                            {c.label}
                        </p>
                    ))}
                </>
            )}
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
    latestWinners: (p) => <LatestWinners {...p} />,
    leaderboardPeek: (p) => <LeaderboardPeek {...p} />,
    notVoted: (p) => <NotVoted {...p} />,
    attention: (p) => <Attention {...p} />,
    ballotHealth: (p) => <BallotHealth {...p} />,
    tiebreak: (p) => <Tiebreak {...p} />,
    revealReadiness: (p) => <RevealReadiness {...p} />,
}

export function HomeWidget({ id, ...props }: { id: WidgetId } & Props) {
    return <>{RENDER[id](props)}</>
}
