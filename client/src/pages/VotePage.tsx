import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import CategoryVoteCard from "../components/vote/CategoryVoteCard"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { useUserData } from "../context/UserContenxt"
import { closesInLabel, dashStates, findMatchingNominee, votedCount } from "../lib/voting"
import type { BallotDetail, Member } from "../types"

const SAVE_ERROR = "Couldn't save. Voting may be closed."

const VotePage = () => {
    const { ballotId } = useParams<{ ballotId: string }>()
    const { member } = useUserData()
    const myMemberId = member?.id ?? null
    const [ballot, setBallot] = useState<BallotDetail | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [myVotes, setMyVotes] = useState<Record<string, string>>({})
    const [index, setIndex] = useState(0)
    const [done, setDone] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [errors, setErrors] = useState<Record<string, string | null>>({})

    const load = useCallback(async () => {
        if (!ballotId) return
        try {
            const [detail, votes] = await Promise.all([fetchBallotDetail(ballotId), fetchMyVotes(ballotId)])
            setBallot(detail)
            setMyVotes(votes)
            if (detail.categories.some((c) => c.nominee_mode === "group")) setMembers(await fetchMembers())
        } catch {
            setLoadError("Couldn't load this ballot.")
        }
    }, [ballotId])

    useEffect(() => { load() }, [load])

    const ids = useMemo(() => ballot?.categories.map((c) => c.id) ?? [], [ballot])

    if (loadError) return <Shell><p className="p-6">{loadError}</p></Shell>
    if (!ballot || !ballotId) return <Shell><p className="p-6 opacity-60">Loading...</p></Shell>
    if (ballot.categories.length === 0) return <Shell><p className="p-6">This ballot has no categories.</p></Shell>

    const now = Date.now()
    const readOnly = ballot.status !== "open" || now < new Date(ballot.opens_at).getTime() || now >= new Date(ballot.closes_at).getTime()
    const total = ballot.categories.length
    const category = ballot.categories[Math.min(index, total - 1)]
    const setError = (cid: string, msg: string | null) => setErrors((e) => ({ ...e, [cid]: msg }))

    const save = async (cid: string, nomineeId: string | null, run: () => Promise<void>) => {
        const prev = myVotes[cid]
        setError(cid, null)
        setMyVotes((v) => {
            const next = { ...v }
            if (nomineeId) next[cid] = nomineeId
            else delete next[cid]
            return next
        })
        try {
            await run()
        } catch {
            setMyVotes((v) => {
                const next = { ...v }
                if (prev) next[cid] = prev
                else delete next[cid]
                return next
            })
            setError(cid, SAVE_ERROR)
        }
    }

    const vote = (nomineeId: string) => save(category.id, nomineeId, () => castVote(ballotId, category.id, nomineeId))
    const clear = () => save(category.id, null, () => clearVote(ballotId, category.id))

    const addOption = async (name: string) => {
        const existing = findMatchingNominee(category.nominees, name)
        if (existing) return vote(existing.id)
        try {
            const nomineeId = await addNominee(category.id, name.trim(), [])
            await load()
            await vote(nomineeId)
        } catch {
            setError(category.id, SAVE_ERROR)
        }
    }

    const addGroup = async (memberIds: string[]) => {
        try {
            const nomineeId = await addNominee(category.id, "", memberIds)
            await load()
            await vote(nomineeId)
        } catch {
            setError(category.id, SAVE_ERROR)
        }
    }

    const voted = votedCount(myVotes, ids)
    const states = dashStates(ids, myVotes, done ? -1 : index)
    const isLast = index >= total - 1
    const go = (i: number) => { setDone(false); setIndex(i) }
    const unvoted = ballot.categories.map((c, i) => ({ c, i })).filter(({ c }) => !myVotes[c.id])

    return (
        <Shell>
            <div className="fixed left-0 right-0 top-0 z-50 flex gap-[2px] bg-zinc-900 px-2 pt-2">
                {states.map((s, i) => (
                    <button
                        key={ids[i]}
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`Category ${i + 1}: ${ballot.categories[i].name}, ${s.voted ? "voted" : "not voted"}`}
                        aria-current={s.current ? "step" : undefined}
                        className={`flex-1 rounded-sm ${s.current ? "h-3 ring-1 ring-[#fffadd]" : "h-2"} ${s.voted ? "bg-[#fffadd]" : "bg-white/15"}`}
                    />
                ))}
            </div>

            <div className="px-4 pt-6">
                <div className="flex items-baseline justify-between">
                    <b className="text-base">{ballot.name}</b>
                    <span className="text-xs opacity-60">{closesInLabel(ballot.closes_at)}</span>
                </div>
                <div className="mt-1 text-xs opacity-60">{voted} of {total} voted</div>
                {readOnly && <div role="status" className="mt-3 rounded-xl bg-[#3f3f46] p-2 text-center text-sm">Voting is closed</div>}

                {done ? (
                    <section className="mt-8 text-center">
                        <h2 className="text-2xl font-semibold">{voted === total ? "All done!" : "Almost there"}</h2>
                        <p className="mt-2 text-sm opacity-70">You voted in {voted} of {total} categories.</p>
                        {unvoted.length > 0 && (
                            <ul className="mt-4 space-y-2 text-left">
                                {unvoted.map(({ c, i }) => (
                                    <li key={c.id}>
                                        <button type="button" onClick={() => go(i)} className="w-full rounded-xl bg-[#3f3f46] p-3 text-left text-sm">
                                            {i + 1}. {c.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link to="/app/ballots" className="mt-6 inline-block rounded-full bg-[#fffadd] px-5 py-2 text-sm font-medium text-black">Back to ballots</Link>
                    </section>
                ) : (
                    <CategoryVoteCard
                        key={category.id}
                        category={category}
                        index={index}
                        total={total}
                        selectedId={myVotes[category.id]}
                        readOnly={readOnly}
                        myMemberId={myMemberId}
                        members={members}
                        error={errors[category.id] ?? null}
                        onVote={vote}
                        onClear={clear}
                        onAddOption={addOption}
                        onAddGroup={addGroup}
                    />
                )}
            </div>

            {/* Pager replaces NavigationTabs on this page so the two fixed bars never overlap. */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#fffadd]/10 bg-zinc-900/95 px-6 py-4 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between">
                    <button type="button" disabled={done || index === 0} onClick={() => go(index - 1)} className="rounded-full bg-[#302f2d] px-5 py-2 text-sm disabled:opacity-40">← Back</button>
                    {done ? (
                        <Link to="/app/ballots" className="text-sm opacity-70">Exit</Link>
                    ) : isLast ? (
                        <button type="button" onClick={() => setDone(true)} className="rounded-full bg-[#fffadd] px-5 py-2 text-sm font-medium text-black">Done</button>
                    ) : (
                        <button type="button" onClick={() => go(index + 1)} className="rounded-full bg-[#fffadd] px-5 py-2 text-sm font-medium text-black">Next →</button>
                    )}
                </div>
            </div>
        </Shell>
    )
}

const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-zinc-900 pb-28 pt-10 text-[#fffadd]">
        {children}
    </div>
)

export default VotePage
