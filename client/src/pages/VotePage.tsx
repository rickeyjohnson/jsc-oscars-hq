import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import CategoryVoteCard from "../components/vote/CategoryVoteCard"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMemberAvatars, fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { useUserData } from "../context/UserContenxt"
import { closesInLabel, opensAtLabel } from "../lib/time"
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

const refreshFailed = (): VoteMessage => ({ tone: "error", title: "Added, but couldn't refresh the list", detail: "Reload the page to see it." })

const VotePage = () => {
    const { ballotId } = useParams<{ ballotId: string }>()
    const { member, loading: userLoading } = useUserData()
    const myMemberId = member?.id ?? null
    const [ballot, setBallot] = useState<BallotDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [myVotes, setMyVotes] = useState<Record<string, string>>({})
    const [pending, setPending] = useState<Record<string, boolean>>({})
    const [messages, setMessages] = useState<Record<string, VoteMessage | null>>({})
    const [reviewing, setReviewing] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [idx, setIdx] = useState(0)
    const [jumpOpen, setJumpOpen] = useState(false)
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
                const [detail, votes] = await Promise.all([fetchBallotDetail(ballotId), fetchMyVotes(ballotId)])
                if (cancelled) return
                confirmed.current = { ...votes }
                setBallot(detail)
                setMyVotes(votes)
                try {
                    fetchMemberAvatars().then((a) => !cancelled && setAvatars(a), () => {})
                } catch {
                    /* faces fall back to initials */
                }
                if (detail.categories.some((c) => c.nominee_mode === "group")) setMembers(await fetchMembers())
            } catch {
                if (!cancelled) setLoadError("Couldn't load this ballot.")
            }
        })()
        return () => { cancelled = true }
    }, [ballotId, userLoading, myMemberId])

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
    const fail = (cid: string, e: unknown, retry: () => void) => {
        const kind = classifySaveError(e, new Date(ballot?.closes_at ?? Date.now() + 1), new Date(), typeof navigator === "undefined" ? true : navigator.onLine !== false)
        const m = saveErrorMessage(kind)
        setMessage(cid, { tone: "error", title: m.title, detail: m.detail, retry: m.canRetry ? retry : undefined })
    }

    const save = (cid: string, nomineeId: string | null, run: () => Promise<void>) => {
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
        const task = (chains.current[cid] ?? Promise.resolve()).then(async () => {
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
            if (seqs.current[cid] !== seq) return // a newer tap owns the UI state
            setPending((p) => ({ ...p, [cid]: false }))
            if (!ok) {
                const last = confirmed.current[cid]
                setMyVotes((v) => {
                    const next = { ...v }
                    if (last) next[cid] = last
                    else delete next[cid]
                    return next
                })
                fail(cid, failure, () => { save(cid, nomineeId, run) })
            }
        })
        chains.current[cid] = task
        return task
    }

    if (userLoading || (!loadError && myMemberId && !ballot)) return <Shell><p className="text-callout text-label-2">Loading...</p></Shell>
    if (!myMemberId) return <Shell><p className="text-callout">Your account isn't linked to a member name yet. Ask a committee member.</p></Shell>
    if (loadError) return <Shell><p className="text-callout">{loadError}</p></Shell>
    if (!ballot || !ballotId) return <Shell><p className="text-callout text-label-2">Loading...</p></Shell>
    if (ballot.categories.length === 0) return <Shell><p className="text-callout">This ballot has no categories.</p></Shell>

    const now = Date.now()
    const readOnly = ballot.status !== "open" || now < new Date(ballot.opens_at).getTime() || now >= new Date(ballot.closes_at).getTime()
    const total = ballot.categories.length
    const voted = votedCount(myVotes, ids)
    const left = total - voted
    const states = dashStates(ids, myVotes, idx)

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
        if (existing) return save(cid, existing.id, () => castVote(ballotId, cid, existing.id))
        try {
            const nomineeId = await addNominee(cid, name.trim(), [])
            await refreshDetail().catch(() => setMessage(cid, refreshFailed()))
            await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
        } catch (e) {
            fail(cid, e, () => { addOption(cid, name) })
        }
    }

    const addGroup = async (cid: string, memberIds: string[]) => {
        const cat = ballot.categories.find((c) => c.id === cid)
        // The same set of people already exists: vote for it instead of making a copy.
        const existing = cat ? findGroupBySet(cat.nominees, memberIds) : undefined
        if (existing) {
            await save(cid, existing.id, () => castVote(ballotId, cid, existing.id))
            setMessage(cid, { tone: "info", title: "That group already exists", detail: `We selected "${existing.display_name}" for you instead of making a copy.` })
            return
        }
        try {
            const nomineeId = await addNominee(cid, "", memberIds)
            await refreshDetail().catch(() => setMessage(cid, refreshFailed()))
            await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
        } catch (e) {
            fail(cid, e, () => { addGroup(cid, memberIds) })
        }
    }

    return (
        <Shell title={ballot.name}>
            <div className="sticky top-0 z-30 -mx-gutter bg-bg px-gutter">
                <ProgressStrip states={states} labels={ballot.categories.map((c) => c.name)} onJump={jump} onOpenJump={() => setJumpOpen(true)} />
            </div>

            <div className="mt-2 flex items-baseline justify-between text-subhead text-label-2">
                <span>
                    {voted} of {total} voted
                </span>
                <span>{closesInLabel(new Date(ballot.closes_at), new Date())}</span>
            </div>
            <Button variant="plain" size="md" className="-ml-5" onClick={() => setJumpOpen(true)}>
                Jump to category
            </Button>
            {readOnly && (
                <div role="status" className="mt-3 rounded-card bg-surface-2 p-3 text-center text-subhead">
                    {ballot.status === "open" && now < new Date(ballot.opens_at).getTime() ? opensAtLabel(new Date(ballot.opens_at)) : "Voting is closed"}
                </div>
            )}

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
                    />
                ))}
            </div>

            {reviewing && (
                <ReviewStep
                    rows={reviewRows(ballot.categories, myVotes, myMemberId)}
                    readOnly={readOnly}
                    finishTo={SUBMIT_ENABLED ? `/app/ballots/${ballotId}/submit` : "/app/ballots"}
                    backTo="/app/ballots"
                    onEdit={jump}
                />
            )}

            <BottomAccessory>
                <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3 bg-bg px-gutter py-3">
                    {reviewing ? (
                        <Button size="md" variant="secondary" className="flex-1" onClick={() => jump(total - 1)}>
                            Back
                        </Button>
                    ) : (
                        <>
                            <Button size="md" variant="secondary" className="flex-1" disabled={idx === 0} onClick={() => jump(idx - 1)}>
                                Back
                            </Button>
                            <Button size="md" variant={onLast || myVotes[ids[idx]] ? "primary" : "tinted"} className="flex-1" onClick={goNext}>
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
                            title={c.name}
                            subtitle={myVotes[c.id] ? "Voted" : "Not voted"}
                            selected={i === idx && !reviewing}
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

const Shell = ({ title = "Ballot", children }: { title?: string; children: React.ReactNode }) => (
    <Screen title={title} back={{ to: "/app/ballots", label: "Ballots" }} width="wide">
        {children}
    </Screen>
)

export default VotePage
