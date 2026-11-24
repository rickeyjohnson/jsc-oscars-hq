import type { Ballot, Category, Member, Nominee } from "../types"
import type { PebbleName } from "../ui/tokens"
import { avatarFallback } from "../ui/logic/avatar"
import { pebbleAt } from "../ui/logic/pebble"
import { closedAtLabel } from "./time"
import { TimeoutError } from "./timeout"

// Members never see nominees linked to themselves (includes groups they are in).
export const selectableNominees = (nominees: Nominee[], myMemberId: string | null): Nominee[] =>
    myMemberId ? nominees.filter((n) => !n.member_ids.includes(myMemberId)) : nominees

export const groupCandidates = (members: Member[], myMemberId: string | null): Member[] =>
    myMemberId ? members.filter((m) => m.id !== myMemberId) : members

export const votedCount = (myVotes: Record<string, string>, categoryIds: string[]): number =>
    categoryIds.filter((id) => myVotes[id]).length

export type DashState = { voted: boolean; current: boolean; failed?: boolean }

/** `failed` marks categories (other than the current one) whose last save failed. */
export const dashStates = (categoryIds: string[], myVotes: Record<string, string>, currentIndex: number, failed?: ReadonlySet<string>): DashState[] =>
    categoryIds.map((id, i) => ({ voted: Boolean(myVotes[id]), current: i === currentIndex, ...(failed?.has(id) && i !== currentIndex ? { failed: true } : {}) }))

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

export type ChipStatus = Ballot["status"] | "ended"

// An open ballot whose close time has passed (never closed by hand) reads as "ended".
export const chipStatus = (b: Pick<Ballot, "status" | "closes_at">, now: Date): ChipStatus =>
    b.status === "open" && new Date(b.closes_at).getTime() <= now.getTime() ? "ended" : b.status

// Group votes: anyone may make a group of 2 to GROUP_MAX_SIZE other people (client-side cap; the DB only requires 2+).
export const GROUP_MIN_SIZE = 2
export const GROUP_MAX_SIZE = 3
export const GROUP_SIZE_CHOICES = [2, 3, 4, 5, 6] as const

/** How many people a voter must pick for this category: exact when the committee set a size, else the older 2 to 3. */
export const groupLimits = (c: { group_size?: number | null }): { min: number; max: number } =>
    c.group_size ? { min: c.group_size, max: c.group_size } : { min: GROUP_MIN_SIZE, max: GROUP_MAX_SIZE }

/** The size a group category is saved with (new group categories default to pairs); other modes store none. */
export const groupSizeToSave = (c: { nominee_mode: string; group_size?: number | null }): number | null =>
    c.nominee_mode === "group" ? (c.group_size ?? GROUP_MIN_SIZE) : null

export const isGroupNominee = (n: Nominee): boolean => n.member_ids.length > 1

/** Groups that include me: shown locked, never hidden. A single-person nominee that is me stays hidden. */
export const lockedNominees = (nominees: Nominee[], myMemberId: string | null): Nominee[] =>
    myMemberId ? nominees.filter((n) => isGroupNominee(n) && n.member_ids.includes(myMemberId)) : []

/** The stable identity of a nominee: the member id for one person (so their color matches everywhere), else the nominee id. */
export const nomineeKey = (n: Nominee): string => (n.member_ids.length === 1 ? n.member_ids[0] : n.id)

/**
 * Pebble per nominee. A person keeps their member pebble app-wide; every other option (group, noun, outsider)
 * takes pebbles in list order from the top, so all seven are used before any repeats.
 */
export const nomineePebbles = (nominees: Nominee[]): Record<string, PebbleName> => {
    const out: Record<string, PebbleName> = {}
    let next = 0
    for (const n of nominees) out[n.id] = n.member_ids.length === 1 ? avatarFallback(n.member_ids[0]) : pebbleAt(next++)
    return out
}

export const joinNames = (names: string[]): string =>
    names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`

export const findGroupBySet = (nominees: Nominee[], memberIds: string[]): Nominee | undefined => {
    const key = [...memberIds].sort().join("|")
    return nominees.find((n) => isGroupNominee(n) && [...n.member_ids].sort().join("|") === key)
}

export type VoteMessage = { tone: "error" | "info" | "warn"; title: string; detail: string; retry?: () => void; retryLabel?: string }
export type SaveErrorKind = "closed" | "network" | "rule" | "groupSize" | "nameTaken" | "unlinked" | "expired" | "generic"

/** Sort a failed save into the one message that tells the voter what to do. */
export const classifySaveError = (e: unknown, closesAt: Date, now: Date, online = true, status: string = "open"): SaveErrorKind => {
    if (now.getTime() >= closesAt.getTime() || status !== "open") return "closed"
    const err = e as { code?: string; message?: string } | null
    const msg = String(err?.message ?? "")
    if (err?.code === "PGRST301" || (err as { status?: number } | null)?.status === 401 || /jwt expired|not signed in|invalid jwt/i.test(msg)) return "expired"
    if (!online || e instanceof TypeError || e instanceof TimeoutError || /failed to fetch|network|load failed/i.test(msg)) return "network"
    if (/ballot is not open/i.test(msg)) return "closed"
    if (/a group needs at least two/i.test(msg)) return "groupSize"
    if (/a different nominee with this name already exists/i.test(msg)) return "nameTaken"
    if (/account is not linked/i.test(msg)) return "unlinked"
    if (err?.code === "42501" || /row-level security|violates/i.test(msg)) return "rule"
    return "generic"
}

export const saveErrorMessage = (kind: SaveErrorKind, closesAt?: Date): Omit<VoteMessage, "retry" | "tone"> & { canRetry: boolean } => {
    switch (kind) {
        case "closed":
            return { title: closesAt ? closedAtLabel(closesAt) : "Voting has closed", detail: "Your last saved vote stands. Cards are read-only.", canRetry: false }
        case "network":
            return { title: "Couldn't save your vote", detail: "Check your connection and try again. Your previous vote is still saved.", canRetry: true }
        case "rule":
            return { title: "Couldn't save your vote", detail: "You can't vote for yourself or a group you're in.", canRetry: false }
        case "groupSize":
            return { title: "Couldn't add the group", detail: "Pick one more person.", canRetry: false }
        case "nameTaken":
            return { title: "Couldn't add that option", detail: "That name is already taken. Pick it from the list.", canRetry: false }
        case "unlinked":
            return { title: "Couldn't save your vote", detail: "Your account isn't linked to a member. Ask a committee member.", canRetry: false }
        case "expired":
            return { title: "You were signed out", detail: "Log in to keep voting. The votes you already saved are safe.", canRetry: false }
        default:
            return { title: "Couldn't save your vote", detail: "Something went wrong. Try again.", canRetry: true }
    }
}

export type ReviewRow = { index: number; category: string; pick: string | null; pebble: PebbleName | null }

/** One row per category for the Review step: what I picked (with its pebble), or null when skipped. */
export const reviewRows = (categories: Category[], myVotes: Record<string, string>, myMemberId: string | null): ReviewRow[] =>
    categories.map((c, index) => {
        const options = selectableNominees(c.nominees, myMemberId)
        const picked = options.find((n) => n.id === myVotes[c.id])
        return { index, category: c.name, pick: picked?.display_name ?? null, pebble: picked ? nomineePebbles(options)[picked.id] : null }
    })

/** First category with no vote, or -1 when all are voted. */
export const firstUnvotedIndex = (categoryIds: string[], myVotes: Record<string, string>): number => categoryIds.findIndex((id) => !myVotes[id])

/** Home "Your ballots": every running ballot (drafts and not-yet-open ones excluded), not fully voted first, then soonest closing. */
export const openBallotRows = (summaries: BallotSummary[], now: Date): BallotSummary[] => {
    const full = (b: BallotSummary) => b.category_count > 0 && b.my_vote_count >= b.category_count
    return summaries
        .filter((b) => b.status !== "draft" && (() => { const s = ballotCardStatus(b, b.category_count, b.my_vote_count, now); return s === "open" || s === "voted" })())
        .sort((a, b) => Number(full(a)) - Number(full(b)) || new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime())
}
