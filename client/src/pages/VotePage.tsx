import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import CategoryVoteCard from "../components/vote/CategoryVoteCard"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMemberAvatars, fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { useUserData } from "../context/UserContenxt"
import { closesInLabel, opensAtLabel } from "../lib/time"
import { dashStates, findMatchingNominee, nextUnvotedIndex, selectableNominees, votedCount } from "../lib/voting"
import type { BallotDetail, Member } from "../types"
import { Screen } from "../ui/Screen"
import { Sheet } from "../ui/Sheet"
import { ListRow } from "../ui/ListRow"
import { GroupedSection } from "../ui/GroupedSection"
import { BottomAccessory } from "../ui/BottomAccessory"
import { ProgressStrip } from "../ui/ProgressStrip"

const SAVE_ERROR = "Couldn't save. Voting may be closed."

const VotePage = () => {
    const { ballotId } = useParams<{ ballotId: string }>()
    const { member, loading: userLoading } = useUserData()
    const myMemberId = member?.id ?? null
    const [ballot, setBallot] = useState<BallotDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [myVotes, setMyVotes] = useState<Record<string, string>>({})
    const [pending, setPending] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string | null>>({})
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

    const setError = (cid: string, msg: string | null) => setErrors((e) => ({ ...e, [cid]: msg }))

    const save = (cid: string, nomineeId: string | null, run: () => Promise<void>) => {
        const seq = (seqs.current[cid] ?? 0) + 1
        seqs.current[cid] = seq
        setError(cid, null)
        setPending((p) => ({ ...p, [cid]: true }))
        setMyVotes((v) => {
            const next = { ...v }
            if (nomineeId) next[cid] = nomineeId
            else delete next[cid]
            return next
        })
        const task = (chains.current[cid] ?? Promise.resolve()).then(async () => {
            let ok = true
            try {
                await run()
                if (nomineeId) confirmed.current[cid] = nomineeId
                else delete confirmed.current[cid]
            } catch {
                ok = false
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
                setError(cid, SAVE_ERROR)
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
        setIdx(i)
    }
    const jumpNextUnvoted = () => {
        const i = nextUnvotedIndex(ids, myVotes, idx)
        if (i >= 0) jump(i)
    }

    const addOption = async (cid: string, name: string) => {
        const cat = ballot.categories.find((c) => c.id === cid)
        if (!cat) return
        const existing = findMatchingNominee(selectableNominees(cat.nominees, myMemberId), name)
        if (existing) return save(cid, existing.id, () => castVote(ballotId, cid, existing.id))
        try {
            const nomineeId = await addNominee(cid, name.trim(), [])
            await refreshDetail().catch(() => setError(cid, "Added, but couldn't refresh the list."))
            await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
        } catch {
            setError(cid, SAVE_ERROR)
        }
    }

    const addGroup = async (cid: string, memberIds: string[]) => {
        try {
            const nomineeId = await addNominee(cid, "", memberIds)
            await refreshDetail().catch(() => setError(cid, "Added, but couldn't refresh the list."))
            await save(cid, nomineeId, () => castVote(ballotId, cid, nomineeId))
        } catch {
            setError(cid, SAVE_ERROR)
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
                        current={i === idx}
                        readOnly={readOnly}
                        myMemberId={myMemberId}
                        members={members}
                        avatars={avatars}
                        error={errors[c.id] ?? null}
                        registerRef={(el) => { cardEls.current[c.id] = el }}
                        onVote={(nid) => { save(c.id, nid, () => castVote(ballotId, c.id, nid)) }}
                        onClear={() => { save(c.id, null, () => clearVote(ballotId, c.id)) }}
                        onAddOption={(name) => { addOption(c.id, name) }}
                        onAddGroup={(mids) => { addGroup(c.id, mids) }}
                    />
                ))}
            </div>

            {left === 0 && (
                <div className="mt-6 rounded-card border-l-4 border-pebble-lime bg-surface p-4">
                    <p className="text-headline">All done — {voted} of {total} voted</p>
                    <Link to="/app/ballots" className="mt-1 inline-block min-h-11 py-2 text-subhead font-bold text-accent">Back to ballots</Link>
                </div>
            )}

            <BottomAccessory>
                <div className="mx-auto flex w-full max-w-[1040px] items-center gap-3 bg-bg px-gutter py-3">
                    <button type="button" aria-label="Previous category" disabled={idx === 0} onClick={() => jump(idx - 1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-fill text-label disabled:opacity-40">
                        <ChevronLeft aria-hidden className="size-5" />
                    </button>
                    <button type="button" disabled={left === 0} onClick={jumpNextUnvoted} className="h-11 min-w-0 flex-1 rounded-full bg-inverse px-4 text-subhead font-bold text-on-inverse disabled:opacity-40">
                        Next unvoted · {left} left
                    </button>
                    <button type="button" aria-label="Next category" disabled={idx >= total - 1} onClick={() => jump(idx + 1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-fill text-label disabled:opacity-40">
                        <ChevronRight aria-hidden className="size-5" />
                    </button>
                </div>
            </BottomAccessory>

            <Sheet open={jumpOpen} onClose={() => setJumpOpen(false)} title="Jump to a category" detents={["large"]}>
                <GroupedSection>
                    {ballot.categories.map((c, i) => (
                        <ListRow
                            key={c.id}
                            title={c.name}
                            subtitle={myVotes[c.id] ? "Voted" : "Not voted"}
                            selected={i === idx}
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
