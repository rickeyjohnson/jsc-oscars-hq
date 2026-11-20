import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import CategoryVoteCard from "../components/vote/CategoryVoteCard"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { useUserData } from "../context/UserContenxt"
import { closesInLabel } from "../lib/time"
import { dashStates, findMatchingNominee, nextUnvotedIndex, selectableNominees, votedCount } from "../lib/voting"
import type { BallotDetail, Member } from "../types"

const SAVE_ERROR = "Couldn't save. Voting may be closed."

const VotePage = () => {
    const { ballotId } = useParams<{ ballotId: string }>()
    const { member, loading: userLoading } = useUserData()
    const myMemberId = member?.id ?? null
    const [ballot, setBallot] = useState<BallotDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [myVotes, setMyVotes] = useState<Record<string, string>>({})
    const [pending, setPending] = useState<Record<string, boolean>>({})
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [errors, setErrors] = useState<Record<string, string | null>>({})
    const [loadError, setLoadError] = useState<string | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
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
                if (detail.categories.some((c) => c.nominee_mode === "group")) setMembers(await fetchMembers())
            } catch {
                if (!cancelled) setLoadError("Couldn't load this ballot.")
            }
        })()
        return () => { cancelled = true }
    }, [ballotId, userLoading, myMemberId])

    const ids = useMemo(() => ballot?.categories.map((c) => c.id) ?? [], [ballot])

    useEffect(() => {
        if (ids.length === 0) return
        const obs = new IntersectionObserver(
            (entries) => { for (const e of entries) if (e.isIntersecting) setActiveId((e.target as HTMLElement).dataset.cid ?? null) },
            { rootMargin: "-35% 0px -55% 0px" },
        )
        for (const id of ids) {
            const el = cardEls.current[id]
            if (el) { el.dataset.cid = id; obs.observe(el) }
        }
        return () => obs.disconnect()
    }, [ids])

    const setError = (cid: string, msg: string | null) => setErrors((e) => ({ ...e, [cid]: msg }))

    const save = (cid: string, nomineeId: string | null, run: () => Promise<void>) => {
        const seq = (seqs.current[cid] ?? 0) + 1
        seqs.current[cid] = seq
        setError(cid, null)
        setPending((p) => ({ ...p, [cid]: true }))
        setExpanded((x) => ({ ...x, [cid]: false }))
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

    if (userLoading || (!loadError && myMemberId && !ballot)) return <Shell><p className="p-6 opacity-60">Loading...</p></Shell>
    if (!myMemberId) return <Shell><p className="p-6">Your account isn't linked to a member name yet. Ask a committee member.</p></Shell>
    if (loadError) return <Shell><p className="p-6">{loadError}</p></Shell>
    if (!ballot || !ballotId) return <Shell><p className="p-6 opacity-60">Loading...</p></Shell>
    if (ballot.categories.length === 0) return <Shell><p className="p-6">This ballot has no categories.</p></Shell>

    const now = Date.now()
    const readOnly = ballot.status !== "open" || now < new Date(ballot.opens_at).getTime() || now >= new Date(ballot.closes_at).getTime()
    const total = ballot.categories.length
    const voted = votedCount(myVotes, ids)
    const left = total - voted
    const states = dashStates(ids, myVotes, ids.indexOf(activeId ?? ""))

    const jump = (i: number) => {
        const el = cardEls.current[ids[i]]
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus({ preventScroll: true })
    }
    const jumpNextUnvoted = () => {
        const i = nextUnvotedIndex(ids, myVotes, Math.max(0, ids.indexOf(activeId ?? "")))
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
        <Shell>
            <div className="sticky top-0 z-30 overflow-x-auto bg-zinc-900 px-2 [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-[2px]" style={{ width: "100%" }}>
                    {states.map((s, i) => (
                        <button
                            key={ids[i]}
                            type="button"
                            onClick={() => jump(i)}
                            aria-label={`Category ${i + 1}: ${ballot.categories[i].name}, ${s.voted ? "voted" : "not voted"}`}
                            aria-current={s.current ? "step" : undefined}
                            className="flex-1 basis-0 min-w-[6px] py-2"
                        >
                            <span className={`block w-full rounded-sm ${s.current ? "h-3 ring-1 ring-[#fffadd]" : "h-2"} ${s.voted ? "bg-[#fffadd]" : "bg-white/15"}`} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3 px-4 pt-3">
                <div>
                    <Link to="/app/ballots" className="text-xs opacity-70">← Back to ballots</Link>
                    <div className="mt-1 flex items-baseline justify-between">
                        <b className="text-base">{ballot.name}</b>
                        <span className="text-xs opacity-60">{closesInLabel(new Date(ballot.closes_at), new Date())}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-60">{voted} of {total} voted</div>
                </div>
                {readOnly && <div role="status" className="rounded-xl bg-[#3f3f46] p-2 text-center text-sm">Voting is closed</div>}

                {ballot.categories.map((c, i) => (
                    <CategoryVoteCard
                        key={c.id}
                        category={c}
                        index={i}
                        total={total}
                        selectedId={myVotes[c.id]}
                        pending={Boolean(pending[c.id])}
                        expanded={Boolean(expanded[c.id])}
                        readOnly={readOnly}
                        myMemberId={myMemberId}
                        members={members}
                        error={errors[c.id] ?? null}
                        registerRef={(el) => { cardEls.current[c.id] = el }}
                        onToggle={() => setExpanded((x) => ({ ...x, [c.id]: !x[c.id] }))}
                        onVote={(nid) => { save(c.id, nid, () => castVote(ballotId, c.id, nid)) }}
                        onClear={() => { save(c.id, null, () => clearVote(ballotId, c.id)) }}
                        onAddOption={(name) => { addOption(c.id, name) }}
                        onAddGroup={(mids) => { addGroup(c.id, mids) }}
                    />
                ))}

                {left === 0 && (
                    <div className="rounded-2xl bg-[#27272a] p-4 text-center">
                        <p className="font-semibold">All done — {voted} of {total} voted</p>
                        <Link to="/app/ballots" className="mt-3 inline-block rounded-full bg-[#fffadd] px-5 py-2 text-sm font-medium text-black">Back to ballots</Link>
                    </div>
                )}
            </div>

            {/* Sits just above NavigationTabs (about 76px tall). */}
            <div className="fixed bottom-[76px] left-0 right-0 z-30 border-t border-[#fffadd]/10 bg-zinc-900/95 px-6 py-3 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <span className="text-sm opacity-70">{left} left</span>
                    <button type="button" disabled={left === 0} onClick={jumpNextUnvoted} className="rounded-full bg-[#fffadd] px-4 py-2 text-sm font-medium text-black disabled:opacity-40">
                        Jump to next unvoted ↓
                    </button>
                </div>
            </div>
            <NavigationTabs activeTab="ballots" />
        </Shell>
    )
}

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-zinc-900 pb-44 text-[#fffadd]">
        <div><NavigationBar /></div>
        {children}
    </div>
)

export default VotePage
