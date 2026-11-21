import { useCallback, useEffect, useRef, useState } from "react"
import { fetchBallotDetail, fetchBallotSummaries } from "../../api/ballots"
import { fetchCommitteeMemberIds, fetchMembers } from "../../api/members"
import { fetchResults } from "../../api/results"
import { fetchAllVotes } from "../../api/votes"
import { ROUND_ORDER } from "../../lib/tallyView"
import type { BallotSummary } from "../../lib/voting"
import type { BallotDetail, Member, ResultRow, VoteRow } from "../../types"

// A main ballot with its tiebreak/committee rounds, everything the detail page shows, loaded together.
export type Family = {
    main: BallotSummary
    rounds: BallotSummary[]
    members: Member[]
    committeeMemberIds: string[]
    details: Record<string, BallotDetail>
    votes: Record<string, VoteRow[]>
    results: Record<string, ResultRow>
}

export const familyBallots = (f: Family): BallotSummary[] => [f.main, ...f.rounds]

export async function loadFamily(ballotId: string): Promise<Family> {
    const all = await fetchBallotSummaries(true)
    const found = all.find((b) => b.id === ballotId)
    if (!found) throw new Error("Ballot not found")
    const mainId = found.parent_ballot_id ?? found.id
    const main = all.find((b) => b.id === mainId) ?? found
    const rounds = all.filter((b) => b.parent_ballot_id === main.id).sort((a, b) => ROUND_ORDER[a.round] - ROUND_ORDER[b.round] || a.opens_at.localeCompare(b.opens_at))
    const fam = [main, ...rounds]
    const [members, committeeMemberIds, ds, vs] = await Promise.all([
        fetchMembers(),
        fetchCommitteeMemberIds(),
        Promise.all(fam.map((b) => fetchBallotDetail(b.id))),
        Promise.all(fam.map((b) => fetchAllVotes(b.id))),
    ])
    const rows = await fetchResults(ds[0].categories.map((c) => c.id))
    return {
        main,
        rounds,
        members,
        committeeMemberIds,
        details: Object.fromEntries(fam.map((b, i) => [b.id, ds[i]])),
        votes: Object.fromEntries(fam.map((b, i) => [b.id, vs[i]])),
        results: Object.fromEntries(rows.map((r) => [r.category_id, r])),
    }
}

export function useBallotFamily(ballotId: string | undefined) {
    const [family, setFamily] = useState<Family | null>(null)
    const [error, setError] = useState(false)
    // a failed refresh while a good copy is on screen: keep showing it and say so (not the load-error screen)
    const [refreshFailed, setRefreshFailed] = useState(false)
    const have = useRef(false)
    const alive = useRef(true)
    useEffect(() => {
        alive.current = true
        return () => {
            alive.current = false
        }
    }, [])

    // Resolves to the fresh family (null when it failed), so callers can carry on from it.
    const reload = useCallback(async (): Promise<Family | null> => {
        if (!ballotId) return null
        try {
            const f = await loadFamily(ballotId)
            if (alive.current) {
                have.current = true
                setFamily(f)
                setError(false)
                setRefreshFailed(false)
            }
            return f
        } catch (e) {
            console.error(e)
            if (alive.current) {
                if (have.current) setRefreshFailed(true)
                else setError(true)
            }
            return null
        }
    }, [ballotId])

    useEffect(() => {
        void reload()
    }, [reload])

    const retry = () => {
        setError(false)
        have.current = false
        setFamily(null)
        void reload()
    }
    return { family, error, refreshFailed, reload, retry }
}
