import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import CategoryVoteCard from "../components/vote/CategoryVoteCard"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMemberAvatars, fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { useUserData } from "../context/UserContenxt"
import { closedAtLabel, closesInLabel, opensAtLabel } from "../lib/time"
import { classifySaveError, dashStates, findGroupBySet, findMatchingNominee, firstUnvotedIndex, reviewRows, saveErrorMessage, selectableNominees, votedCount, type VoteMessage } from "../lib/voting"
import type { BallotDetail, Member } from "../types"
import { Screen } from "../ui/Screen"
import { Sheet } from "../ui/Sheet"
import { ListRow } from "../ui/ListRow"
import { Button } from "../ui/Button"
import { SUBMIT_ENABLED } from "../ui/copy"
import ReviewStep from "../components/vote/ReviewStep"
import { GroupedSection } from "../ui/GroupedSection"
import { BottomAccessory } from "../ui/BottomAccessory"
import { ProgressStrip } from "../ui/ProgressStrip"
import { VoteBanner } from "../components/vote/VoteBanner"
import { useRefetchOnFocus } from "../ui/useRefetchOnFocus"
import { chipClasses } from "../ui/logic/variants"
import { ErrorState } from "../ui/ErrorState"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { COPY } from "../ui/copy"
import { withTimeout } from "../lib/timeout"

// Module-level so the clock read is not seen as render-time work.
const closesDate = (iso?: string): Date => new Date(iso ?? Date.now() + 1)

const refreshFailed = (): VoteMessage => ({ tone: "error", title: "Added, but couldn't refresh the list", detail: "Reload the page to see it." })

const VotePage = () => {
    const { ballotId } = useParams<{ ballotId: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const { member, loading: userLoading } = useUserData()
    const myMemberId = member?.id ?? null
    const [ballot, setBallot] = useState<BallotDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [myVotes, setMyVotes] = useState<Record<string, string>>({})
    const [pending, setPending] = useState<Record<string, boolean>>({})
    const [messages, setMessages] = useState<Record<string, VoteMessage | null>>({})
    const [reviewing, setReviewing] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)
    const [idx, setIdx] = useState(0)
    const [jumpOpen, setJumpOpen] = useState(false)
    const [groupOpenFor, setGroupOpenFor] = useState<string | null>(null)
    const [avatars, setAvatars] = useState<Record<string, string | null>>({})
    const scrollOnChange = useRef(false)
    // Per-category save queue: saves run in tap order; confirmed holds the last value the DB accepted.
    const chains = useRef<Record<string, Promise<void>>>({})
    const seqs = useRef<Record<string, number>>({})
    const confirmed = useRef<Record<string, string>>({})
    const cardEls = useRef<Record<string, HTMLElement | null>>({})

    // Detail only; never touches votes. Throws on failure so callers decide how to report it.
    const refreshDetail = useCallback(async () => {
        if (!ballotId) return
        setBallot(await fetchBallotDetail(ballotId))
    }, [ballotId])

    useEffect(() => {
        if (!ballotId || userLoading || !myMemberId) return
        let cancelled = false
        ;(async () => {
            try {
                const [detail, votes] = await Promise.all([withTimeout(fetchBallotDetail(ballotId)), fetchMyVotes(ballotId)])
                if (cancelled) return
                confirmed.current = { ...votes }
                setBallot(detail)
                setMyVotes(votes)
                try {
                    fetchMemberAvatars().then((a) => !cancelled && setAvatars(a), () => {})
                } catch {
                    /* faces fall back to initials */
                }
                // Only group categories need members; if that fetch fails the ballot still opens (the group sheet has no names).
                if (detail.categories.some((c) => c.nominee_mode === "group")) {
                    try {
                        const m = await fetchMembers()
                        if (!cancelled) setMembers(m)
                    } catch (e) {
                        console.error("Couldn't load members for group picks", e)
                    }
                }
            } catch {
                if (!cancelled) setLoadError("Couldn't load this ballot.")
            }
        })()
        return () => { cancelled = true }
    }, [ballotId, userLoading, myMemberId, attempt])

    // Re-render when the window opens or closes while the page is open; also re-check the ballot on focus.
    const [, setTick] = useState(0)
    useEffect(() => {
        if (!ballot) return
        const t = Date.now()
        const edges = [new Date(ballot.opens_at).getTime(), new Date(ballot.closes_at).getTime()].filter((x) => x > t)
        if (edges.length === 0) return
        const wait = Math.min(Math.min(...edges) - t + 50, 2_000_000_000)
        const h = setTimeout(() => setTick((n) => n + 1), wait)
        return () => clearTimeout(h)
    }, [ballot])
    useRefetchOnFocus(() => { void refreshDetail().catch(() => {}) })

    const ids = useMemo(() => ballot?.categories.map((c) => c.id) ?? [], [ballot])

    // After a Prev/Next/jump, bring the new category into view and move focus to it.
    useEffect(() => {
        if (!scrollOnChange.current) return
        scrollOnChange.current = false
        const el = cardEls.current[ids[idx]]
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        el.focus({ preventScroll: true })
    }, [idx, ids])

    const setMessage = (cid: string, msg: VoteMessage | null) => setMessages((m) => ({ ...m, [cid]: msg }))

    // Turn a failed save into the one message that says what happened, with Try again where retrying can help.
    // A "rule" denial may really be a committee close: refetch the ballot once and reclassify before showing it.
    const fail = async (cid: string, e: unknown, retry: () => void) => {
        const seq = seqs.current[cid]
        const online = typeof navigator === "undefined" ? true : navigator.onLine !== false
        let b: BallotDetail | null = ballot
        let kind = classifySaveError(e, closesDate(b?.closes_at), new Date(), online, b?.status)
        if (kind === "rule" && ballotId) {
            try {
                b = await fetchBallotDetail(ballotId)
                setBallot(b)
                kind = classifySaveError(e, new Date(b.closes_at), new Date(), online, b.status)
            } catch {
                /* keep the rule message */
            }
        }
        if (seqs.current[cid] !== seq) return // a newer tap owns the UI state
        if (kind === "closed" && b?.status === "open") void refreshDetail().catch(() => {})
        const m = saveErrorMessage(kind, b ? new Date(b.closes_at) : undefined)
        const login = () => navigate("/login", { state: { from: location.pathname + location.search, notice: "You were signed out. Log in to keep voting." } })
        setMessage(cid, { tone: kind === "closed" ? "warn" : "error", title: m.title, detail: m.detail, ...(kind === "expired" ? { retry: login, retryLabel: "Log in" } : { retry: m.canRetry ? retry : undefined }) })
    }

    // Resolves true only when this save was accepted by the server.
    const save = (cid: string, nomineeId: string | null, run: () => Promise<void>): Promise<boolean> => {
        const seq = (seqs.current[cid] ?? 0) + 1
        seqs.current[cid] = seq
        setMessage(cid, null)
        setPending((p) => ({ ...p, [cid]: true }))
        setMyVotes((v) => {
            const next = { ...v }
            if (nomineeId) next[cid] = nomineeId
            else delete next[cid]
            return next
        })
        const task = (chains.current[cid] ?? Promise.resolve()).then(async (): Promise<boolean> => {
            let ok = true
            let failure: unknown
            try {
                await run()
                if (nomineeId) confirmed.current[cid] = nomineeId
                else delete confirmed.current[cid]
            } catch (e) {
                ok = false
                failure = e
            }
            if (seqs.current[cid] !== seq) return ok // a newer tap owns the UI state
            setPending((p) => ({ ...p, [cid]: false }))
            if (!ok) {
                const last = confirmed.current[cid]
                setMyVotes((v) => {
                    const next = { ...v }
                    if (last) next[cid] = last
                    else delete next[cid]
                    return next
                })
                void fail(cid, failure, () => { save(cid, nomineeId, run) })
            }
            return ok
        })
        chains.current[cid] = task.then(() => {})
        return task
    }

    if (userLoading || (!loadError && myMemberId && !ballot)) return <Shell><VoteSkeleton /></Shell>
    if (!myMemberId) return <Shell><p className="text-callout">Your account isn't linked to a member name yet. Ask a committee member.</p></Shell>
    if (loadError)
        return (
            <Shell>
                <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("this ballot")} onRetry={() => { setLoadError(null); setBallot(null); setAttempt((n) => n + 1) }} />
            </Shell>
        )
    if (!ballot || !ballotId) return <Shell><VoteSkeleton /></Shell>
    if (ballot.categories.length === 0) return <Shell><p className="text-callout">This ballot has no categories.</p></Shell>

    const now = Date.now()
    const upcoming = ballot.status === "open" && now < new Date(ballot.opens_at).getTime()
    const readOnly = ballot.status !== "open" || upcoming || now >= new Date(ballot.closes_at).getTime()
    const total = ballot.categories.length
    const voted = votedCount(myVotes, ids)
    const left = total - voted
    const failedIds = new Set(ids.filter((id) => messages[id]?.tone === "error"))
    const states = dashStates(ids, myVotes, idx, failedIds)
    // A save that failed after you moved on: say so on the category you are looking at.
    const failedAway = reviewing ? ids.findIndex((id) => failedIds.has(id)) : ids.findIndex((id, i) => i !== idx && failedIds.has(id))

    const jump = (i: number) => {
        if (i < 0 || i >= total) return
        scrollOnChange.current = true
        setReviewing(false)
        setIdx(i)
    }
    const jumpFirstUnvoted = () => {
        const i = firstUnvotedIndex(ids, myVotes)
        if (i >= 0) jump(i)
    }
    const onLast = idx >= total - 1
    const nextLabel = onLast ? "Review" : myVotes[ids[idx]] ? "Next" : "Skip"
    const goNext = () => {
        if (onLast) {
            window.scrollTo?.({ top: 0 })
            setReviewing(true)
        } else jump(idx + 1)
    }

    const addOption = async (cid: string, name: string) => {
        const cat = ballot.categories.find((c) => c.id === cid)
        if (!cat) return
        const existing = findMatchingNominee(selectableNominees(cat.nominees, myMemberId), name)
        const already = (n: { display_name: string }): VoteMessage => ({ tone: "info", title: "That option already exists", detail: `We selected "${n.display_name}" for you.` })
        if (existing) {
            if (await save(cid, existing.id, () => castVote(ballotId, cid, existing.id))) setMessage(cid, already(existing))
            return
        }
        try {
            const nomineeId = await addNominee(cid, name.trim(), [])
            const dupe = cat.nominees.find((n) => n.id === nomineeId)
            await refreshDetail().catch(() => setMessage(cid, refreshFailed()))
            const ok = await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
            if (ok && dupe) setMessage(cid, already(dupe))
        } catch (e) {
            void fail(cid, e, () => { addOption(cid, name) })
        }
    }

    const addGroup = async (cid: string, memberIds: string[]) => {
        const cat = ballot.categories.find((c) => c.id === cid)
        // The same set of people already exists: vote for it instead of making a copy.
        const existing = cat ? findGroupBySet(cat.nominees, memberIds) : undefined
        const already = (n: { display_name: string }): VoteMessage => ({ tone: "info", title: "That group already exists", detail: `We selected "${n.display_name}" for you instead of making a copy.` })
        if (existing) {
            if (await save(cid, existing.id, () => castVote(ballotId, cid, existing.id))) setMessage(cid, already(existing))
            return
        }
        try {
            const nomineeId = await addNominee(cid, "", memberIds)
            // The server may hand back a group that was created after our last fetch (a race): same notice.
            const dupe = cat?.nominees.find((n) => n.id === nomineeId)
            await refreshDetail().catch(() => setMessage(cid, refreshFailed()))
            const ok = await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
            if (ok && dupe) setMessage(cid, already(dupe))
        } catch (e) {
            void fail(cid, e, () => { addGroup(cid, memberIds) })
        }
    }

    return (
        <Shell title={ballot.name}>
            {!reviewing && (
                <div className="sticky top-0 z-30 -mx-gutter bg-bg px-gutter">
                    <ProgressStrip states={states} labels={ballot.categories.map((c) => c.name)} onJump={jump} onOpenJump={() => setJumpOpen(true)} />
                </div>
            )}

            {reviewing ? (
                <Button variant="link" size="md" className="-ml-5" onClick={() => jump(total - 1)}>
                    ‹ Back
                </Button>
            ) : (
                <>
                    <div className="mt-1 flex items-center justify-between">
                        <span className="text-subhead font-bold">{`Category ${idx + 1} of ${total}`}</span>
                        <Button variant="link" size="md" className="-mr-5" onClick={() => setJumpOpen(true)}>
                            Jump to…
                        </Button>
                    </div>
                    <div className="flex items-center justify-between text-subhead text-label-2">
                        <span>
                            {voted} of {total} voted
                        </span>
                        <span className={chipClasses("neutral")}>{closesInLabel(new Date(ballot.closes_at), new Date(now))}</span>
                    </div>
                </>
            )}
            {failedAway >= 0 && (
                <VoteBanner
                    className="mt-3"
                    tone="error"
                    title={`Couldn't save your vote in ${ballot.categories[failedAway].name}`}
                    detail="Your previous vote there is still saved."
                    retry={() => jump(failedAway)}
                    retryLabel="Go to it"
                />
            )}
            {readOnly &&
                (upcoming ? (
                    <VoteBanner className="mt-3" tone="warn" title={opensAtLabel(new Date(ballot.opens_at))} />
                ) : (
                    <VoteBanner
                        className="mt-3"
                        tone="warn"
                        title={ballot.status === "open" || new Date(ballot.closes_at).getTime() <= now ? closedAtLabel(new Date(ballot.closes_at)) : "Voting is closed"}
                        detail="Your last saved vote stands. Cards are read-only."
                    />
                ))}

            <div className="mt-5">
                {ballot.categories.map((c, i) => (
                    <CategoryVoteCard
                        key={c.id}
                        category={c}
                        index={i}
                        total={total}
                        selectedId={myVotes[c.id]}
                        pending={Boolean(pending[c.id])}
                        current={i === idx && !reviewing}
                        readOnly={readOnly}
                        myMemberId={myMemberId}
                        members={members}
                        avatars={avatars}
                        message={messages[c.id] ?? null}
                        myName={member?.name}
                        registerRef={(el) => { cardEls.current[c.id] = el }}
                        onVote={(nid) => { save(c.id, nid, () => castVote(ballotId, c.id, nid)) }}
                        onClear={() => { save(c.id, null, () => clearVote(ballotId, c.id)) }}
                        onAddOption={(name) => { addOption(c.id, name) }}
                        onAddGroup={(mids) => { addGroup(c.id, mids) }}
                        groupOpen={groupOpenFor === c.id}
                        onGroupOpenChange={(o) => setGroupOpenFor(o ? c.id : null)}
                    />
                ))}
            </div>

            {reviewing && (
                <ReviewStep
                    rows={reviewRows(ballot.categories, myVotes, myMemberId)}
                    readOnly={readOnly}
                    onEdit={jump}
                />
            )}

            <BottomAccessory>
                <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3 bg-bg px-gutter py-3 lg:justify-end">
                    {!readOnly && !reviewing && ballot.categories[idx].nominee_mode === "group" && (
                        <Button size="md" variant="ghost" className="mr-auto hidden lg:inline-flex" onClick={() => setGroupOpenFor(ids[idx])}>
                            + Add a group
                        </Button>
                    )}
                    {readOnly ? (
                        <Button size="md" className="w-full lg:w-auto" to="/app/ballots">
                            Back to ballots
                        </Button>
                    ) : reviewing ? (
                        <Button size="md" className="w-full lg:w-auto lg:min-w-32" to={SUBMIT_ENABLED ? `/app/ballots/${ballotId}/submit` : "/app/ballots"}>
                            Finish voting
                        </Button>
                    ) : (
                        <>
                            <Button size="md" variant="secondary" className="flex-[0.45] lg:min-w-32 lg:flex-none" disabled={idx === 0} onClick={() => jump(idx - 1)}>
                                Back
                            </Button>
                            <Button size="md" variant={onLast || myVotes[ids[idx]] ? "primary" : "tinted"} className="flex-1 lg:min-w-32 lg:flex-none" onClick={goNext}>
                                {nextLabel}
                            </Button>
                        </>
                    )}
                </div>
            </BottomAccessory>

            <Sheet open={jumpOpen} onClose={() => setJumpOpen(false)} title="Jump to a category" detents={["large"]}>
                <Button fullWidth disabled={left === 0} onClick={() => { setJumpOpen(false); jumpFirstUnvoted() }}>
                    Go to first unvoted
                </Button>
                <GroupedSection>
                    {ballot.categories.map((c, i) => (
                        <ListRow
                            key={c.id}
                            title={
                                <>
                                    {i === idx && !reviewing && <span aria-hidden>→ </span>}
                                    {c.name}
                                </>
                            }
                            subtitle={
                                failedIds.has(c.id) ? (
                                    <span className="font-bold text-pebble-cherry">Couldn't save</span>
                                ) : myVotes[c.id] ? (
                                    `Voted${i === idx && !reviewing ? " (here)" : ""}`
                                ) : (
                                    <span className="font-bold text-pebble-lemon">Not voted{i === idx && !reviewing ? " (here)" : ""}</span>
                                )
                            }
                            current={i === idx && !reviewing}
                            onClick={() => {
                                setJumpOpen(false)
                                jump(i)
                            }}
                        />
                    ))}
                </GroupedSection>
            </Sheet>
        </Shell>
    )
}

const VoteSkeleton = () => (
    <SkeletonScreen label="Loading ballot">
        <div className="space-y-4">
            <Skeleton shape="row" />
            <Skeleton shape="card" />
        </div>
    </SkeletonScreen>
)

const Shell = ({ title = "Ballot", children }: { title?: string; children: React.ReactNode }) => (
    <Screen title={title} back={{ to: "/app/ballots", label: "Ballots" }} width="wide">
        {children}
    </Screen>
)

export default VotePage
