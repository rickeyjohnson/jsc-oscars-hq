import type { Member, Nominee } from "../types"

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

export const closesInLabel = (closesAt: string, now: Date = new Date()): string => {
    const ms = new Date(closesAt).getTime() - now.getTime()
    if (ms <= 0) return "Closed"
    const plural = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`
    const days = Math.floor(ms / 86_400_000)
    if (days >= 1) return `Closes in ${plural(days, "day")}`
    const hours = Math.floor(ms / 3_600_000)
    if (hours >= 1) return `Closes in ${plural(hours, "hour")}`
    return `Closes in ${plural(Math.max(1, Math.floor(ms / 60_000)), "minute")}`
}
