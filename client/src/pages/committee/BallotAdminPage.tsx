import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { createRoundBallot, setBallotStatus } from "../../api/ballots"
import { recordResultsGuarded, updatePlaces, upsertResults } from "../../api/results"
import ResultsSection, { type CsvEntry } from "../../components/committee/ResultsSection"
import { ActionSheet, CloseTimeField } from "../../components/committee/ActionSheet"
import { ReopenSheet } from "../../components/committee/ReopenSheet"
import { NextCard } from "../../components/committee/NextCard"
import { Stepper } from "../../components/committee/Stepper"
import WhoVoted from "../../components/committee/WhoVoted"
import { attachPlaces } from "../../lib/places"
import { publishBlockers } from "../../lib/ballotForm"
import { leftNames, nextCard, PHASE_LABEL, PHASE_PEBBLE, phaseOf, stepperSteps, votedSummary, type Phase, type PrimaryId } from "../../lib/ballotFlow"
import { canReopen, closeTimeProblem, localDateTimeInput } from "../../lib/reopen"
import { manualResult, roundEntries } from "../../lib/rounds"
import { manualBase, type CategoryView } from "../../lib/tallyView"
import { toUtcIso } from "../../lib/time"
import { completionByMember, type BallotSummary } from "../../lib/voting"
import { useConfirm } from "../../ui/ConfirmProvider"
import { Screen } from "../../ui/Screen"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { SegmentedControl } from "../../ui/SegmentedControl"
import { GroupedSection } from "../../ui/GroupedSection"
import { ErrorState } from "../../ui/ErrorState"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { COPY } from "../../ui/copy"
import { familyBallots, useBallotFamily, type Family } from "./useBallotFamily"
import { pendingWrites, placeFixes, mainTallies, viewsFor } from "./familyLogic"
import type { Nominee } from "../../types"

const UPDATE_FAILED = "Couldn't update the ballot. Check your connection and try again."
const ACTION_FAILED = "Couldn't save that. Check your connection and try again."
const ROUND_LABEL = { main: "Main", tiebreak: "Tiebreak", committee: "Committee" } as const
const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

const BallotAdminPage = () => {
    const { ballotId } = useParams()
    const navigate = useNavigate()
    const confirm = useConfirm()
    const { family, error, reload, retry } = useBallotFamily(ballotId)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [recordError, setRecordError] = useState(false)
    const [sheet, setSheet] = useState<null | "close" | "reopen" | "round">(null)
    const [closesAt, setClosesAt] = useState(() => localDateTimeInput(new Date()))
    const recording = useRef(false)

    const now = new Date()
    const sel: BallotSummary | null = family ? (familyBallots(family).find((b) => b.id === (selectedId ?? ballotId)) ?? family.main) : null
    // a committee round has no voting window: it is "closed" until every winner is entered
    const phaseFor = (b: BallotSummary): Phase => {
        const p = phaseOf(b, now)
        return b.round === "committee" && p !== "released" ? "closed" : p
    }

    // ---- automatic record step (idempotent; guarded writes make it safe if two members open the ballot at once)
    const autoRecord = useCallback(async (f: Family): Promise<Family> => {
        const writes = pendingWrites(f, new Date())
        const fixes = placeFixes(f)
        if (writes.length === 0 && fixes.length === 0) return f
        await recordResultsGuarded(writes)
        if (fixes.length > 0 && writes.length === 0) await updatePlaces(fixes)
        return (await reload()) ?? f
    }, [reload])

    const pending = useMemo(() => (family ? pendingWrites(family, new Date()).length : 0), [family])
    const fixesNeeded = useMemo(() => (family ? placeFixes(family).length : 0), [family])
    // the same pending work is attempted once (a lost race that wrote nothing must not loop)
    const sig = useMemo(() => (family ? pendingWrites(family, new Date()).map((w) => `${w.row.category_id}:${w.expected}`).join("|") + "#" + fixesNeeded : ""), [family, fixesNeeded])
    const attempted = useRef("")
    useEffect(() => {
        if (!family || (pending === 0 && fixesNeeded === 0) || recordError || recording.current || attempted.current === sig) return
        attempted.current = sig
        recording.current = true
        autoRecord(family)
            .catch((e) => {
                console.error(e)
                setRecordError(true)
            })
            .finally(() => {
                recording.current = false
            })
    }, [family, pending, fixesNeeded, sig, recordError, autoRecord])

    // a committee round closes itself once every category has its winner
    useEffect(() => {
        if (!family) return
        for (const rb of family.rounds) {
            if (rb.round !== "committee" || rb.status !== "open") continue
            const cats = family.details[rb.id].categories
            if (cats.length > 0 && cats.every((c) => family.results[c.id]?.winner_nominee_id && family.results[c.id]?.decided_ballot_id === rb.id)) {
                setBallotStatus(rb.id, "closed").then(() => reload()).catch((e) => console.error(e))
            }
        }
    }, [family, reload])

    if (error) return <Screen title="Ballot" back={{ to: "/app/profile/ballots", label: "Ballots" }} width="wide"><ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("this ballot")} onRetry={retry} /></Screen>
    if (!family || !sel)
        return (
            <Screen title="Ballot" back={{ to: "/app/profile/ballots", label: "Ballots" }} width="wide">
                <SkeletonScreen label="Loading ballot">
                    <div className="space-y-4">
                        <Skeleton shape="block" />
                        <Skeleton shape="card" />
                    </div>
                </SkeletonScreen>
            </Screen>
        )

    const phase = phaseFor(sel)
    const detail = family.details[sel.id]
    const views = viewsFor(family, sel)
    const mainDetail = family.details[family.main.id]
    const names: Record<string, string> = {}
    for (const d of Object.values(family.details)) for (const c of d.categories) for (const n of c.nominees) names[n.id] = n.display_name
    const nameOf = (id: string) => names[id] ?? "Unknown nominee"

    const rows = completionByMember(family.members, family.votes[sel.id] ?? [], detail.categories.length)
    const sum = votedSummary(rows)
    const blockers = sel.status === "draft" ? publishBlockers(detail) : []
    const committeeRound = sel.round === "committee"
    const childRounds = family.rounds.filter((r) => r.parent_ballot_id === sel.id)
    const seasonReleased = family.main.status === "released"

    const undecided = views.filter((v) => !v.recordedWinnerId)
    const optionsFor = (v: CategoryView): Nominee[] => {
        const ids = committeeRound ? detail.categories.find((c) => c.id === v.category_id)?.nominees.map((n) => n.id) ?? [] : v.manualOptions
        const all = mainDetail.categories.find((c) => c.id === v.category_id)?.nominees ?? []
        return all.filter((n) => ids.includes(n.id))
    }
    const toEnterViews = phase === "closed" && pendingWrites(family, now).length === 0 ? undecided.filter((v) => (committeeRound || v.step === "manual") && optionsFor(v).length > 0) : []
    const toEnter = toEnterViews.map((view) => ({ view, options: optionsFor(view) }))

    const nextKind = sel.round === "main" ? "tiebreak" : sel.round === "tiebreak" ? "committee" : null
    const existingNext = nextKind ? family.rounds.find((r) => r.round === nextKind) : undefined
    const candidates = nextKind && !existingNext && phase === "closed" ? undecided.filter((v) => v.step === nextKind) : []
    const entries = nextKind ? roundEntries(candidates.map((v) => v.tally), nextKind, family.results) : []
    const laterRounds = family.rounds.filter((r) => r.round !== "main" && r.round !== sel.round && (sel.round === "main" || r.round === "committee"))
    const mainViews = viewsFor(family, family.main)
    const mainDecided = mainDetail.categories.every((c) => family.results[c.id]?.winner_nominee_id)

    const next = nextCard({
        phase,
        round: sel.round,
        opensLabel: when(sel.opens_at),
        closesLabel: when(sel.closes_at),
        blockers,
        finished: sum.finished,
        claimed: sum.claimed,
        left: sum.left,
        recording: pending > 0 && !recordError,
        recordError,
        categoryCount: views.length,
        decided: views.length - undecided.length,
        toEnter: toEnter.length,
        tied: entries.length,
        nextRound: entries.length > 0 ? nextKind : null,
        roundRunning: laterRounds.length > 0 && undecided.length > 0,
        allDecided: mainDecided,
    })

    const steps = stepperSteps({
        phase: phaseOf(family.main, now),
        hasTiebreak: family.rounds.some((r) => r.round === "tiebreak"),
        tiesNeeded: phaseOf(family.main, now) === "closed" && mainViews.some((v) => v.step === "tiebreak" && !v.recordedWinnerId),
        allDecided: mainDecided,
    })

    const run = async (work: () => Promise<boolean | void>, fail = ACTION_FAILED) => {
        setBusy(true)
        setActionError(null)
        try {
            return (await work()) ?? true
        } catch (e) {
            console.error(e)
            setActionError(fail)
            return false
        } finally {
            setBusy(false)
        }
    }

    const close = async () => {
        const ok = await run(async () => {
            await setBallotStatus(sel.id, "closed")
            const fresh = await reload()
            if (fresh) await autoRecord(fresh) // recording is part of closing
        }, UPDATE_FAILED)
        if (ok) setSheet(null)
    }

    const publish = async () => {
        if (!(await confirm({ title: "Publish this ballot?", message: `Members can vote from ${when(sel.opens_at)} until ${when(sel.closes_at)}.`, confirmLabel: "Publish" }))) return
        await run(async () => {
            await setBallotStatus(sel.id, "open")
            await reload()
        }, UPDATE_FAILED)
    }

    const startRound = async () => {
        if (!nextKind) return
        const problem = nextKind === "tiebreak" ? closeTimeProblem(closesAt, new Date()) : null
        if (problem) return setActionError(problem)
        const ok = await run(async () => {
            const until = nextKind === "tiebreak" ? toUtcIso(closesAt) : new Date(Date.now() + 7 * 86_400_000).toISOString()
            await createRoundBallot(family.main, nextKind, entries, until)
            const f = await reload()
            const made = f?.rounds.find((r) => r.round === nextKind)
            if (made) setSelectedId(made.id)
        })
        if (ok) setSheet(null)
    }

    const saveWinner = async (v: CategoryView, nomineeId: string): Promise<boolean> => {
        const existing = family.results[v.category_id]
        const prev = existing?.winner_nominee_id
        if (prev && prev === nomineeId) return true
        const ask = prev
            ? { title: `Replace the ${v.name} winner?`, message: `${v.name} is recorded as ${nameOf(prev)}. Saving makes ${nameOf(nomineeId)} the winner. Members see nothing until you reveal.`, confirmLabel: "Replace winner", cancelLabel: `Keep ${nameOf(prev)}`, destructive: true }
            : { title: `Save ${nameOf(nomineeId)} as the ${v.name} winner?`, message: `${v.name} will be recorded with ${nameOf(nomineeId)} as the winner, entered by hand. You can replace it until the reveal.`, confirmLabel: "Save winner" }
        if (!(await confirm(ask))) return false
        return run(async () => {
            const row = manualResult(manualBase(sel.round, sel.id, v, existing), nomineeId, sel.id)
            const tallies = mainTallies(family)
            await upsertResults([attachPlaces(row, tallies[v.category_id] ?? v.tally, sel.round === "main" ? null : v.tally)])
            await reload()
            return true
        })
    }

    const goPrimary = (id: PrimaryId) => {
        if (id === "publish") return void publish()
        if (id === "see-left") return void document.getElementById("who-voted")?.scrollIntoView({ block: "start" })
        if (id === "enter-winner") return void document.getElementById("enter-winner")?.scrollIntoView({ block: "start" })
        if (id === "start-tiebreak" || id === "start-committee") {
            setClosesAt(localDateTimeInput(new Date()))
            setActionError(null)
            return setSheet("round")
        }
        if (id === "reveal") return navigate("/app/profile/release")
        if (id === "view-results") return navigate("/app/results")
        if (id === "retry-record") {
            attempted.current = ""
            setRecordError(false)
        }
    }

    const ended = phase === "closed" || phase === "released"
    const csvs: CsvEntry[] = familyBallots(family)
        .filter((b) => phaseFor(b) !== "draft" && phaseFor(b) !== "scheduled" && (b.round !== "committee" || (family.votes[b.id]?.length ?? 0) > 0))
        .map((b) => {
            const d = family.details[b.id]
            const voters = new Set((family.votes[b.id] ?? []).map((v) => v.voter_id)).size
            return { ballot: b, label: `${ROUND_LABEL[b.round]} ballot CSV`, detail: `${plural(d.categories.length, "category", "categories")}, ${plural(voters, "voter")}` }
        })

    const showReopen = phase === "closed" && !committeeRound && canReopen(sel, childRounds.length > 0, seasonReleased, now)
    const showClose = phase === "open" && sel.status === "open"
    const left = leftNames(rows)
    const phasePebble = PHASE_PEBBLE[phase]

    return (
        <Screen title={sel.name} back={{ to: "/app/profile/ballots", label: "Ballots" }} width="wide">
            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2 lg:grid-rows-[repeat(4,auto)_1fr] lg:items-start">
                <div className="space-y-3 lg:col-start-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={phasePebble === "grape" ? "neutral" : phasePebble}>{PHASE_LABEL[phase]}</Chip>
                        <span className="text-subhead text-label-2">
                            {phase === "draft" ? "Not published" : phase === "scheduled" ? `Opens ${when(sel.opens_at)}` : phase === "open" ? `Closes ${when(sel.closes_at)}` : `Closed ${when(sel.closes_at)}`}
                        </span>
                    </div>
                    <Stepper steps={steps} />
                    {family.rounds.length > 0 && (
                        <SegmentedControl
                            label="Round"
                            idPrefix="round"
                            value={sel.id}
                            onChange={(id) => { setSelectedId(id); setActionError(null) }}
                            options={familyBallots(family).map((b) => ({ value: b.id, label: ROUND_LABEL[b.round] }))}
                        />
                    )}
                </div>

                <div className="space-y-5 lg:col-start-1">
                    <NextCard next={next} blockers={blockers} busy={busy} onPrimary={goPrimary}>
                        {phase === "draft" && (
                            <Button to={`/app/profile/ballots/create?draft=${sel.id}`} variant="secondary" size="md" fullWidth>
                                Edit draft
                            </Button>
                        )}
                        {showClose && (
                            <Button variant="dangerOutline" size="md" fullWidth disabled={busy} onClick={() => { setActionError(null); setSheet("close") }}>
                                {sel.round === "main" ? "Close now" : `Close ${ROUND_LABEL[sel.round].toLowerCase()} now`}
                            </Button>
                        )}
                        {showReopen && (
                            <Button variant="dangerOutline" size="md" fullWidth disabled={busy} onClick={() => setSheet("reopen")}>
                                Reopen ballot
                            </Button>
                        )}
                        {actionError && <p role="alert" className="text-callout text-danger">{actionError}</p>}
                    </NextCard>
                </div>

                {phase !== "draft" && phase !== "scheduled" && !committeeRound && (
                    <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:row-span-5 lg:self-start">
                        <WhoVoted id="who-voted" rows={rows} />
                    </div>
                )}

                {phase !== "draft" && phase !== "scheduled" && (
                    <div className="lg:col-start-1">
                        <ResultsSection
                            phase={ended ? phase : "open"}
                            views={views}
                            results={family.results}
                            nameOf={nameOf}
                            finishedLine={`${sum.finished} of ${sum.claimed} have finished.`}
                            csvs={csvs}
                            toEnter={toEnter}
                            replaceOptions={(v) => (mainDetail.categories.find((c) => c.id === v.category_id)?.nominees ?? []).filter((n) => n.id !== family.results[v.category_id]?.winner_nominee_id)}
                            editable={phase === "closed" && !seasonReleased}
                            busy={busy}
                            onSaveWinner={saveWinner}
                            enterRef="enter-winner"
                        />
                    </div>
                )}

                <div className="lg:col-start-1">
                    <GroupedSection header="Ballot details">
                        <li className="flex min-h-12 items-center justify-between px-4 text-callout"><span className="text-label-2">Opens</span><span>{when(sel.opens_at)}</span></li>
                        <li className="flex min-h-12 items-center justify-between px-4 text-callout"><span className="text-label-2">Closes</span><span>{when(sel.closes_at)}</span></li>
                        <li className="flex min-h-12 items-center justify-between px-4 text-callout"><span className="text-label-2">Categories</span><span>{detail.categories.length}</span></li>
                    </GroupedSection>
                </div>
            </div>

            <ActionSheet
                open={sheet === "close"}
                onClose={() => setSheet(null)}
                title={sel.round === "main" ? `Close voting for ${sel.name}?` : `Close the ${ROUND_LABEL[sel.round].toLowerCase()} now?`}
                confirmLabel={sel.round === "main" ? "Close voting now" : `Close ${ROUND_LABEL[sel.round].toLowerCase()} now`}
                danger
                onConfirm={close}
                busy={busy}
                error={sheet === "close" ? actionError : null}
            >
                <p className="text-callout text-label-2">
                    {sum.finished} of {sum.claimed} have finished.
                    {left.length > 0 ? ` ${left.slice(0, 5).join(", ")}${left.length > 5 ? ` and ${left.length - 5} more` : ""} cannot vote or change votes after this.` : " Everyone has finished."}
                    {sum.unclaimed > 0 ? ` ${plural(sum.unclaimed, "member")} has not signed up.` : ""}
                </p>
                <p className="text-callout text-label-2">Votes already cast are kept, and the results are recorded right away. You can reopen it until the winners are revealed.</p>
            </ActionSheet>

            <ReopenSheet
                open={sheet === "reopen"}
                onClose={() => setSheet(null)}
                ballotId={sel.id}
                ballotName={sel.name}
                voteCount={(family.votes[sel.id] ?? []).length}
                onDone={() => { setSheet(null); void reload() }}
            />

            <ActionSheet
                open={sheet === "round"}
                onClose={() => setSheet(null)}
                title={nextKind === "tiebreak" ? "Start the tiebreak?" : "Start the committee round?"}
                confirmLabel={nextKind === "tiebreak" ? "Start tiebreak" : "Start committee round"}
                onConfirm={startRound}
                busy={busy}
                error={sheet === "round" ? actionError : null}
            >
                <p className="text-callout text-label-2">
                    {plural(entries.length, "category", "categories")}. {nextKind === "tiebreak" ? "Only the tied nominees are on it. Results for the other categories are already saved." : "There is no vote: one committee member enters each winner on this page."}
                </p>
                <ul className="divide-y divide-sep overflow-hidden rounded-card bg-surface-2">
                    {entries.map((e) => (
                        <li key={e.category_id} className="px-4 py-2 text-callout">
                            <span className="font-bold">{views.find((v) => v.category_id === e.category_id)?.name}</span>
                            <span className="block text-footnote text-label-2">{e.nominee_ids.map(nameOf).join(", ")}</span>
                        </li>
                    ))}
                </ul>
                {nextKind === "tiebreak" && <CloseTimeField label="Tiebreak closes" value={closesAt} onChange={setClosesAt} />}
            </ActionSheet>
        </Screen>
    )
}

export default BallotAdminPage
