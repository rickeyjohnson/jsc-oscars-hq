import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { createRoundBallot, fetchBallotDetail, fetchRoundBallots } from "../../api/ballots"
import { fetchCommitteeMemberIds } from "../../api/members"
import { fetchResults, upsertResults } from "../../api/results"
import { fetchAllVotes } from "../../api/votes"
import { manualResult, roundEntries } from "../../lib/rounds"
import { buildCategoryViews, manualBase, recordPlan, ROUND_ORDER, summaryLine, type Badge, type CategoryView } from "../../lib/tallyView"
import { toUtcIso } from "../../lib/time"
import { chipStatus } from "../../lib/voting"
import type { Ballot, BallotDetail, ResultRow, VoteRow } from "../../types"

type Props = { ballot: Ballot }

type Loaded = {
    detail: BallotDetail
    main: BallotDetail
    votes: VoteRow[]
    results: Record<string, ResultRow>
    committeeMemberIds: string[]
    rounds: Ballot[]
}

const BADGE: Record<Badge, { label: string; className: string }> = {
    winner: { label: "Winner", className: "bg-[#fffadd] text-black" },
    tiebreak: { label: "Tiebreak needed", className: "bg-[#78350f] text-[#fde68a]" },
    committee: { label: "Committee vote needed", className: "bg-[#1e3a8a] text-[#bfdbfe]" },
    manual: { label: "Manual pick needed", className: "bg-[#7f1d1d] text-[#fecaca]" },
}
const DECIDED_BY: Record<string, string> = { votes: "votes", tiebreak: "tiebreak", committee_vote: "committee vote", manual: "manual pick" }

const pad = (n: number) => String(n).padStart(2, "0")
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : e && typeof e === "object" && "message" in e ? String(e.message) : fallback)

const primary = "bg-[#fffadd] text-zinc-900 font-bold rounded-full text-sm px-4 py-2 disabled:opacity-50"
const secondary = "bg-[#302f2d] text-[#fffadd] rounded-full text-sm px-4 py-2 disabled:opacity-50"

// Committee-only tally of a finished ballot: per category ranks and vote counts, next step,
// Record results, the next round, and manual picks.
const TallyPanel = ({ ballot }: Props) => {
    const status = chipStatus(ballot, new Date())
    const ended = status === "ended" || status === "closed" || status === "released"
    const mainId = ballot.round === "main" ? ballot.id : (ballot.parent_ballot_id ?? ballot.id)
    const nextRound = ballot.round === "main" ? "tiebreak" : ballot.round === "tiebreak" ? "committee" : null

    const [data, setData] = useState<Loaded | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [closesAt, setClosesAt] = useState(() => localInput(new Date(Date.now() + 86_400_000)))
    const [picks, setPicks] = useState<Record<string, string>>({})
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const load = useCallback(async () => {
        setLoadError(null)
        try {
            const [detail, votes, committeeMemberIds, rounds] = await Promise.all([
                fetchBallotDetail(ballot.id),
                fetchAllVotes(ballot.id),
                fetchCommitteeMemberIds(),
                fetchRoundBallots(mainId),
            ])
            const main = mainId === ballot.id ? detail : await fetchBallotDetail(mainId)
            const rows = await fetchResults(detail.categories.map((c) => c.id))
            setData({ detail, main, votes, committeeMemberIds, rounds, results: Object.fromEntries(rows.map((r) => [r.category_id, r])) })
        } catch (e) {
            setLoadError(errText(e, "Could not load the tally"))
        }
    }, [ballot.id, mainId])

    useEffect(() => {
        if (ended) load()
    }, [ended, load])

    const views = useMemo(
        () =>
            data
                ? buildCategoryViews({
                      round: ballot.round,
                      categories: data.detail.categories,
                      mainCategories: data.main.categories,
                      votes: data.votes,
                      results: data.results,
                      committeeMemberIds: data.committeeMemberIds,
                  })
                : [],
        [data, ballot.round],
    )

    if (!ended) return <p className="text-sm text-amber-100/60">Tally, ties, tiebreak and winners appear here once voting closes.</p>
    if (loadError)
        return (
            <div className="text-sm text-red-400 space-y-2">
                <p>{loadError}</p>
                <button onClick={load} className={secondary}>Retry</button>
            </div>
        )
    if (!data) return <p className="text-sm text-amber-100/60">Loading tally...</p>

    const names: Record<string, string> = {}
    for (const c of data.main.categories) for (const n of c.nominees) names[n.id] = n.display_name
    const name = (id: string) => names[id] ?? "Unknown nominee"
    const catName = (id: string) => views.find((v) => v.category_id === id)?.name ?? id

    const run = async (work: () => Promise<string | null>) => {
        setBusy(true)
        setActionError(null)
        setNotice(null)
        try {
            const msg = await work()
            if (msg !== null) {
                setNotice(msg)
                await load()
            }
        } catch (e) {
            setActionError(errText(e, "Something went wrong"))
        } finally {
            setBusy(false)
        }
    }

    const recordAll = () =>
        run(async () => {
            const later = new Set(data.rounds.filter((b) => ROUND_ORDER[b.round] > ROUND_ORDER[ballot.round]).map((b) => b.id))
            const plan = recordPlan(ballot.round, ballot.id, views, data.results, later)
            if (plan.overwrites.length > 0) {
                const list = plan.overwrites.map(catName).join(", ")
                if (!window.confirm(`This changes an already recorded winner in: ${list}. Continue?`)) return null
            }
            await upsertResults(plan.rows)
            const kept = plan.skipped.length > 0 ? ` Kept ${plan.skipped.length} decided by a later round or by hand.` : ""
            return `Recorded ${plan.rows.length} ${plan.rows.length === 1 ? "category" : "categories"}.${kept}`
        })

    const roundCandidates = nextRound ? views.filter((v) => v.step === nextRound && !v.recordedWinnerId) : []
    const entries = nextRound ? roundEntries(roundCandidates.map((v) => v.tally), nextRound, data.results) : []
    const existingRound = nextRound ? data.rounds.find((b) => b.round === nextRound) : undefined
    const needsRecord = entries.some((e) => data.results[e.category_id]?.decided_ballot_id !== ballot.id)
    const roundLabel = nextRound === "tiebreak" ? "tiebreak" : "committee"

    const createRound = () =>
        run(async () => {
            if (!nextRound) return null
            if (!closesAt) throw new Error("Pick when the round closes")
            const main: Ballot = data.main
            const n = entries.length
            if (!window.confirm(`Create a ${roundLabel} round with ${n} ${n === 1 ? "category" : "categories"}? It opens for voting right away.`)) return null
            await createRoundBallot(main, nextRound, entries, toUtcIso(closesAt))
            return `Created the ${roundLabel} round.`
        })

    const recordManual = (v: CategoryView) =>
        run(async () => {
            const pick = picks[v.category_id]
            if (!pick) throw new Error("Pick a winner first")
            const existing = data.results[v.category_id]
            if (existing?.winner_nominee_id && existing.winner_nominee_id !== pick) {
                if (!window.confirm(`${v.name} already has a recorded winner (${name(existing.winner_nominee_id)}). Replace it?`)) return null
            }
            await upsertResults([manualResult(manualBase(ballot.round, ballot.id, v, existing), pick, ballot.id)])
            return `Recorded ${name(pick)} for ${v.name}.`
        })

    const toggle = (id: string) =>
        setExpanded((s) => {
            const next = new Set(s)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    return (
        <div className="space-y-3">
            {ballot.round !== "main" && (
                <Link to={`/app/profile/ballots/${mainId}`} className="text-xs text-amber-100/60 underline">
                    ← Main ballot
                </Link>
            )}
            <p className="text-xs text-amber-100/60">{summaryLine(views)}</p>

            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={recordAll} disabled={busy || views.length === 0} className={primary}>
                    Record results
                </button>
                {nextRound && existingRound && (
                    <Link to={`/app/profile/ballots/${existingRound.id}`} className={secondary}>
                        Open {roundLabel} round →
                    </Link>
                )}
            </div>

            {nextRound && !existingRound && entries.length > 0 && (
                <div className="bg-zinc-800/60 rounded-2xl p-3 space-y-2">
                    <label className="block text-xs text-amber-100/60">
                        {roundLabel === "tiebreak" ? "Tiebreak" : "Committee"} round closes
                        <input
                            type="datetime-local"
                            value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)}
                            className="block w-full mt-1 bg-zinc-900 text-[#fffadd] border border-amber-100/20 rounded-xl px-3 py-2 text-sm"
                        />
                    </label>
                    <button onClick={createRound} disabled={busy || needsRecord || !closesAt} className={secondary}>
                        Create {roundLabel} round
                    </button>
                    {needsRecord && <p className="text-xs text-amber-400">Record results first.</p>}
                </div>
            )}

            {notice && <p className="text-xs text-green-400">{notice}</p>}
            {actionError && <p className="text-xs text-red-400">{actionError}</p>}

            {views.length === 0 && <p className="text-sm text-amber-100/60">No categories on this ballot.</p>}
            {views.map((v) => {
                const badge = BADGE[v.badge]
                const open = expanded.has(v.category_id)
                return (
                    <div key={v.category_id} className="bg-zinc-800/60 rounded-2xl p-3">
                        <div className="flex justify-between items-start gap-2">
                            <b className="text-sm">
                                {v.number}. {v.name}
                            </b>
                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${badge.className}`}>{badge.label}</span>
                        </div>
                        {v.recordedWinnerId && (
                            <p className="text-xs text-amber-100/60 mt-1">
                                Recorded: {name(v.recordedWinnerId)}
                                {v.recordedBy ? ` · ${DECIDED_BY[v.recordedBy]}` : ""}
                            </p>
                        )}
                        {v.tally.ranked.length === 0 && <p className="text-xs text-amber-100/60 mt-2">No votes.</p>}
                        <div className="mt-2 space-y-1">
                            {[...v.shown, ...(open ? v.more : [])].map((r) => (
                                <div key={r.nominee_id} className="flex items-center gap-3 text-sm">
                                    <span className="flex-1">{name(r.nominee_id)}</span>
                                    <span className="font-bold tabular-nums">{r.votes}</span>
                                    <span className="text-xs text-amber-100/60 w-6 text-right">#{r.rank}</span>
                                </div>
                            ))}
                        </div>
                        {v.more.length > 0 && (
                            <button onClick={() => toggle(v.category_id)} className="text-xs text-amber-100/60 mt-2">
                                {open ? "Show less ▴" : `+ ${v.more.length} more ▾`}
                            </button>
                        )}
                        {v.manualOptions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                                <select
                                    value={picks[v.category_id] ?? ""}
                                    onChange={(e) => setPicks((p) => ({ ...p, [v.category_id]: e.target.value }))}
                                    className="flex-1 min-w-0 bg-zinc-900 text-[#fffadd] border border-amber-100/20 rounded-xl px-2 py-2 text-sm"
                                >
                                    <option value="">Pick the winner...</option>
                                    {v.manualOptions.map((id) => (
                                        <option key={id} value={id}>
                                            {name(id)}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={() => recordManual(v)} disabled={busy || !picks[v.category_id]} className={primary}>
                                    Record winner
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default TallyPanel
