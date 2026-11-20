import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react"
import { createRoundBallot, fetchBallotDetail, fetchRoundBallots } from "../../api/ballots"
import { fetchCommitteeMemberIds } from "../../api/members"
import { fetchResults, updatePlaces, upsertResults } from "../../api/results"
import { fetchAllVotes } from "../../api/votes"
import { attachPlaces, backfillPlaces } from "../../lib/places"
import { manualResult, roundEntries } from "../../lib/rounds"
import { tallyCategory, type CategoryTally } from "../../lib/tally"
import { badgeFor, buildCategoryViews, manualBase, recordPlan, ROUND_ORDER, summaryLine, type BadgeKey, type CategoryView } from "../../lib/tallyView"
import { toUtcIso } from "../../lib/time"
import { chipStatus } from "../../lib/voting"
import { useConfirm } from "../../ui/ConfirmProvider"
import { Button } from "../../ui/Button"
import { Card } from "../../ui/Card"
import { Chip } from "../../ui/Chip"
import { ColorBlock } from "../../ui/ColorBlock"
import { ErrorState } from "../../ui/ErrorState"
import { Podium, type PodiumItem } from "../../ui/Podium"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { COPY } from "../../ui/copy"
import type { ChipTone } from "../../ui/logic/variants"
import type { Ballot, BallotDetail, ResultRow, VoteRow } from "../../types"

type Props = { ballot: Ballot }

type Loaded = {
    detail: BallotDetail
    main: BallotDetail
    votes: VoteRow[]
    // the main ballot's tally per main category (podium places come from it)
    mainTallies: Record<string, CategoryTally>
    results: Record<string, ResultRow>
    committeeMemberIds: string[]
    rounds: Ballot[]
    // category -> the later round (tiebreak/committee) that contains it; committee wins over tiebreak
    roundByCategory: Record<string, "tiebreak" | "committee">
}

const BADGE: Record<BadgeKey, { label: string; tone: ChipTone }> = {
    winner: { label: "Winner", tone: "lime" },
    tiebreak: { label: "Tiebreak needed", tone: "tangerine" },
    committee: { label: "Committee vote needed", tone: "sky" },
    manual: { label: "Manual pick needed", tone: "cherry" },
    in_tiebreak: { label: "In tiebreak", tone: "warn" },
    in_committee: { label: "In committee round", tone: "warn" },
}
const DECIDED_BY: Record<string, string> = { votes: "votes", tiebreak: "tiebreak", committee_vote: "committee vote", manual: "manual pick" }

const pad = (n: number) => String(n).padStart(2, "0")
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// A message meant for the committee member (a missing pick); anything else is logged and replaced by COPY.
class Invalid extends Error {}
const LOAD_FAILED = COPY.loadFailed("the tally")
const ACTION_FAILED = "Couldn't save that. Check your connection and try again."

const fieldCls = "block w-full min-h-11 rounded-control bg-surface-2 px-3 text-body text-label focus-visible:outline-2 focus-visible:outline-accent"

// Committee-only tally of a finished ballot: per category ranks and vote counts, next step,
// Record results, the next round, and manual picks.
const TallyPanel = ({ ballot }: Props) => {
    const confirm = useConfirm()
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
            const [main, mainVotes] =
                mainId === ballot.id ? [detail, votes] : await Promise.all([fetchBallotDetail(mainId), fetchAllVotes(mainId)])
            const mainTallies = Object.fromEntries(main.categories.map((c) => [c.id, tallyCategory(c.id, mainVotes)]))
            const rows = await fetchResults(detail.categories.map((c) => c.id))
            const roundByCategory: Record<string, "tiebreak" | "committee"> = {}
            const roundDetails = await Promise.all([...rounds].sort((a, b) => ROUND_ORDER[a.round] - ROUND_ORDER[b.round]).map(async (rb) => ({ rb, d: await fetchBallotDetail(rb.id) })))
            for (const { rb, d } of roundDetails) if (rb.round !== "main") for (const c of d.categories) roundByCategory[c.id] = rb.round
            setData({ detail, main, votes, mainTallies, committeeMemberIds, rounds, roundByCategory, results: Object.fromEntries(rows.map((r) => [r.category_id, r])) })
        } catch (e) {
            console.error(e)
            setLoadError(LOAD_FAILED)
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

    if (!ended) return <Card><p className="text-footnote text-label-2">Tally, ties, tiebreak and winners appear here once voting closes.</p></Card>
    if (loadError) return <ErrorState title={COPY.somethingWrong} body={loadError} onRetry={load} />
    if (!data)
        return (
            <SkeletonScreen label="Loading tally">
                <div className="space-y-3">
                    <Skeleton shape="row" />
                    <Skeleton shape="card" />
                    <Skeleton shape="card" />
                </div>
            </SkeletonScreen>
        )

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
            if (!(e instanceof Invalid)) console.error(e)
            setActionError(e instanceof Invalid ? e.message : ACTION_FAILED)
        } finally {
            setBusy(false)
        }
    }

    const recordAll = () =>
        run(async () => {
            const later = new Set(data.rounds.filter((b) => ROUND_ORDER[b.round] > ROUND_ORDER[ballot.round]).map((b) => b.id))
            const plan = recordPlan(ballot.round, ballot.id, views, data.results, later, data.mainTallies)
            if (plan.overwrites.length > 0) {
                const list = plan.overwrites.map(catName).join(", ")
                if (!(await confirm({ title: "Replace recorded winners?", message: `This changes an already recorded winner in: ${list}.`, confirmLabel: "Replace" }))) return null
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
            if (!closesAt) throw new Invalid("Pick when the round closes")
            const main: Ballot = data.main
            const n = entries.length
            if (!(await confirm({ title: `Create a ${roundLabel} round?`, message: `${n} ${n === 1 ? "category" : "categories"}. It opens for voting right away.`, confirmLabel: "Create round" }))) return null
            await createRoundBallot(main, nextRound, entries, toUtcIso(closesAt))
            return `Created the ${roundLabel} round.`
        })

    const recordManual = (v: CategoryView) =>
        run(async () => {
            const pick = picks[v.category_id]
            if (!pick) throw new Invalid("Pick a winner first")
            const existing = data.results[v.category_id]
            if (existing?.winner_nominee_id && existing.winner_nominee_id !== pick) {
                if (!(await confirm({ title: `Replace the winner for ${v.name}?`, message: `${v.name} already has a recorded winner (${name(existing.winner_nominee_id)}).`, confirmLabel: "Replace", destructive: true }))) return null
            }
            const row = manualResult(manualBase(ballot.round, ballot.id, v, existing), pick, ballot.id)
            await upsertResults([attachPlaces(row, data.mainTallies[v.category_id] ?? v.tally, ballot.round === "main" ? null : v.tally)])
            return `Recorded ${name(pick)} for ${v.name}.`
        })

    // Rows recorded before podium places existed (main ballot only).
    const missingPlaces = ballot.round === "main" ? Object.values(data.results).filter((r) => r.places == null && data.mainTallies[r.category_id]) : []

    const fillPlaces = () =>
        run(async () => {
            const roundTallies: Record<string, CategoryTally> = {}
            const roundIds = new Set(missingPlaces.map((r) => r.decided_ballot_id))
            for (const rb of data.rounds.filter((b) => roundIds.has(b.id))) {
                const [detail, roundVotes] = await Promise.all([fetchBallotDetail(rb.id), fetchAllVotes(rb.id)])
                for (const c of detail.categories) {
                    const decidedHere = missingPlaces.some((r) => r.category_id === c.id && r.decided_ballot_id === rb.id)
                    if (decidedHere) roundTallies[c.id] = tallyCategory(c.id, roundVotes, c.nominees.map((n) => n.id))
                }
            }
            const updates = backfillPlaces(missingPlaces, data.mainTallies, roundTallies)
            const filled = await updatePlaces(updates)
            const skipped = updates.length - filled
            const note = skipped > 0 ? ` ${skipped} already had places recorded since this page loaded.` : ""
            return `Filled podium places for ${filled} ${filled === 1 ? "category" : "categories"}.${note}`
        })

    const toggle = (id: string) =>
        setExpanded((s) => {
            const next = new Set(s)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })

    const decided = views.filter((v) => v.badge === "winner").length
    const ties = views.filter((v) => v.badge === "tiebreak" || v.badge === "committee").length
    const manual = views.filter((v) => v.badge === "manual").length

    const podiumFor = (v: CategoryView): PodiumItem[] =>
        v.recordedWinnerId
            ? (data.results[v.category_id]?.places ?? [])
                  .filter((p): p is typeof p & { slot: 1 | 2 | 3 } => p.slot != null)
                  .map((p) => ({ key: p.nominee_id, slot: p.slot, name: name(p.nominee_id) }))
            : []

    return (
        <div className="space-y-4">
            {ballot.round !== "main" && (
                <Button to={`/app/profile/ballots/${mainId}`} variant="plain" size="md" icon={<ChevronLeft aria-hidden className="size-4" />}>
                    Main ballot
                </Button>
            )}
            <p className="sr-only">{summaryLine(views)}</p>
            <div className="grid grid-cols-3 gap-3">
                <ColorBlock pebble="lime" className="p-3!">
                    <div className="text-title-1 font-display tabular-nums">{decided}</div>
                    <div className="text-footnote">decided</div>
                </ColorBlock>
                <ColorBlock pebble="tangerine" className="p-3!">
                    <div className="text-title-1 font-display tabular-nums">{ties}</div>
                    <div className="text-footnote">{ties === 1 ? "tie" : "ties"}</div>
                </ColorBlock>
                <ColorBlock pebble="cherry" className="p-3!">
                    <div className="text-title-1 font-display tabular-nums">{manual}</div>
                    <div className="text-footnote">manual</div>
                </ColorBlock>
            </div>
            {data.committeeMemberIds.length === 0 && (
                <p className="text-footnote text-warn">No committee members found. Every tie left after a tiebreak will need a manual pick. Check profiles.is_committee.</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="md" onClick={recordAll} disabled={busy || views.length === 0}>
                    Record results
                </Button>
                {nextRound && existingRound && (
                    <Button to={`/app/profile/ballots/${existingRound.id}`} variant="secondary" size="md">
                        Open {roundLabel} round →
                    </Button>
                )}
                {missingPlaces.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={fillPlaces} disabled={busy}>
                        Fill in podium places ({missingPlaces.length})
                    </Button>
                )}
            </div>

            {nextRound && !existingRound && entries.length > 0 && (
                <Card className="space-y-3">
                    <label className="block text-footnote text-label-2">
                        {roundLabel === "tiebreak" ? "Tiebreak" : "Committee"} round closes
                        <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={`${fieldCls} mt-1`} />
                    </label>
                    <Button variant="secondary" size="md" onClick={createRound} disabled={busy || needsRecord || !closesAt}>
                        Create {roundLabel} round
                    </Button>
                    {needsRecord && <p className="text-footnote text-warn">Record results first.</p>}
                </Card>
            )}

            {notice && <p role="status" className="text-footnote text-success">{notice}</p>}
            {actionError && <p role="alert" className="text-footnote text-danger">{actionError}</p>}

            {views.length === 0 && <p className="text-callout text-label-2">No categories on this ballot.</p>}
            <div className="grid gap-4 xl:grid-cols-2">
                {views.map((v) => {
                    const badge = BADGE[badgeFor(v, data.roundByCategory)]
                    const open = expanded.has(v.category_id)
                    const podium = podiumFor(v)
                    return (
                        <Card as="section" key={v.category_id}>
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="text-headline">
                                    {v.number}. {v.name}
                                </h4>
                                <Chip tone={badge.tone}>{badge.label}</Chip>
                            </div>
                            {v.recordedWinnerId && (
                                <p className="mt-1 text-footnote text-label-2">
                                    Recorded: {name(v.recordedWinnerId)}
                                    {v.recordedBy ? ` · ${DECIDED_BY[v.recordedBy]}` : ""}
                                </p>
                            )}
                            {podium.length > 0 && (
                                <div className="mt-3">
                                    <Podium items={podium} variant="card" />
                                </div>
                            )}
                            {v.tally.ranked.length === 0 && <p className="mt-2 text-footnote text-label-2">No votes.</p>}
                            {v.tally.ranked.length > 0 && (
                                <table className="mt-3 w-full text-callout">
                                    <caption className="sr-only">Votes for {v.name}</caption>
                                    <thead className="max-lg:sr-only">
                                        <tr className="text-left text-footnote text-label-2">
                                            <th scope="col" className="w-14 py-1 font-normal">Rank</th>
                                            <th scope="col" className="py-1 font-normal">Nominee</th>
                                            <th scope="col" className="w-16 py-1 text-right font-normal">Votes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-sep">
                                        {[...v.shown, ...(open ? v.more : [])].map((r) => (
                                            <tr key={r.nominee_id}>
                                                <td className="w-14 py-2 text-label-2 tabular-nums">#{r.rank}</td>
                                                <td className="py-2">{name(r.nominee_id)}</td>
                                                <td className="w-16 py-2 text-right font-bold tabular-nums">{r.votes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {v.more.length > 0 && (
                                <Button variant="plain" size="sm" className="mt-2" onClick={() => toggle(v.category_id)} icon={open ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}>
                                    {open ? "Show less" : `${v.more.length} more`}
                                </Button>
                            )}
                            {v.manualOptions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <select
                                        aria-label={`Winner for ${v.name}`}
                                        value={picks[v.category_id] ?? ""}
                                        onChange={(e) => setPicks((p) => ({ ...p, [v.category_id]: e.target.value }))}
                                        className={`${fieldCls} min-w-0 flex-1`}
                                    >
                                        <option value="">Pick the winner...</option>
                                        {v.manualOptions.map((id) => (
                                            <option key={id} value={id}>
                                                {name(id)}
                                            </option>
                                        ))}
                                    </select>
                                    <Button variant="primary" size="md" onClick={() => recordManual(v)} disabled={busy || !picks[v.category_id]}>
                                        Record winner
                                    </Button>
                                </div>
                            )}
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default TallyPanel
