import type { Ballot, Member, Nominee } from "../types"

// Members never see nominees linked to themselves (includes groups they are in).
export const selectableNominees = (nominees: Nominee[], myMemberId: string | null): Nominee[] =>
    myMemberId ? nominees.filter((n) => !n.member_ids.includes(myMemberId)) : nominees

export const groupCandidates = (members: Member[], myMemberId: string | null): Member[] =>
    myMemberId ? members.filter((m) => m.id !== myMemberId) : members

export const votedCount = (myVotes: Record<string, string>, categoryIds: string[]): number =>
    categoryIds.filter((id) => myVotes[id]).length

export type DashState = { voted: boolean; current: boolean }

export const dashStates = (categoryIds: string[], myVotes: Record<string, string>, currentIndex: number): DashState[] =>
    categoryIds.map((id, i) => ({ voted: Boolean(myVotes[id]), current: i === currentIndex }))

// Next unvoted category after `currentIndex`, wrapping; -1 when everything is voted.
export const nextUnvotedIndex = (categoryIds: string[], myVotes: Record<string, string>, currentIndex: number): number => {
    const n = categoryIds.length
    for (let step = 1; step <= n; step++) {
        const i = (currentIndex + step) % n
        if (!myVotes[categoryIds[i]]) return i
    }
    return -1
}

export const findMatchingNominee = (nominees: Nominee[], typed: string): Nominee | undefined => {
    const key = typed.trim().toLowerCase()
    return key ? nominees.find((n) => n.display_name.trim().toLowerCase() === key) : undefined
}

export type BallotCardStatus = "upcoming" | "open" | "voted" | "closed"
export type BallotSummary = Ballot & { category_count: number; my_vote_count: number }

export const ballotCardStatus = (b: Ballot, categoryCount: number, myVoteCount: number, now: Date): BallotCardStatus => {
    if (b.status === "closed" || b.status === "released" || new Date(b.closes_at).getTime() <= now.getTime()) return "closed"
    if (new Date(b.opens_at).getTime() > now.getTime()) return "upcoming"
    if (categoryCount > 0 && myVoteCount >= categoryCount) return "voted"
    return "open"
}

export const pendingBallots = (ballots: BallotSummary[], now: Date): BallotSummary[] =>
    ballots.filter((b) => b.category_count > b.my_vote_count && ballotCardStatus(b, b.category_count, b.my_vote_count, now) === "open")

export type MemberCompletion = { name: string; voted: number; total: number; claimed: boolean }

// Per-member progress, least-voted first. Votes by voters who are not members are ignored.
export const completionByMember = (members: Member[], votes: { voter_id: string; category_id: string }[], categoryCount: number): MemberCompletion[] => {
    const byVoter = new Map<string, Set<string>>()
    for (const v of votes) byVoter.set(v.voter_id, (byVoter.get(v.voter_id) ?? new Set()).add(v.category_id))
    return members
        .map((m) => ({
            name: m.name,
            voted: m.user_id ? Math.min(byVoter.get(m.user_id)?.size ?? 0, categoryCount) : 0,
            total: categoryCount,
            claimed: Boolean(m.user_id),
        }))
        .sort((a, b) => a.voted - b.voted || a.name.localeCompare(b.name))
}
