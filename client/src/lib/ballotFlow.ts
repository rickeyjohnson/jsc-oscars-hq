import type { Ballot } from "../types"
import type { PebbleName } from "../ui/tokens"
import type { BallotSummary, MemberCompletion } from "./voting"

// Pure state logic behind Manage ballots and the one ballot-detail page.

export type Phase = "draft" | "scheduled" | "open" | "closed" | "released"

// Scheduled is open with opens_at in the future; ended (open past its close time) reads as closed.
export const phaseOf = (b: Pick<Ballot, "status" | "opens_at" | "closes_at">, now: Date): Phase => {
    if (b.status === "draft") return "draft"
    if (b.status === "released") return "released"
    if (b.status === "closed") return "closed"
    if (new Date(b.opens_at).getTime() > now.getTime()) return "scheduled"
    return new Date(b.closes_at).getTime() > now.getTime() ? "open" : "closed"
}

export const PHASE_LABEL: Record<Phase, string> = { draft: "Draft", scheduled: "Scheduled", open: "Open", closed: "Closed", released: "Released" }
export const PHASE_PEBBLE: Record<Phase, PebbleName> = { draft: "grape", scheduled: "sky", open: "lime", closed: "tangerine", released: "lemon" }

export type GroupKey = "needs" | "open" | "scheduled" | "drafts" | "finished"
export type ManageItem = { ballot: BallotSummary; children: BallotSummary[]; hint: string | null }
export type ManageGroup = { key: GroupKey; title: string; items: ManageItem[] }

const TITLE: Record<GroupKey, string> = { needs: "Needs you", open: "Open", scheduled: "Scheduled", drafts: "Drafts", finished: "Finished" }
const ORDER: GroupKey[] = ["needs", "open", "scheduled", "drafts", "finished"]
const GROUP_OF: Record<Phase, GroupKey> = { closed: "needs", open: "open", scheduled: "scheduled", draft: "drafts", released: "finished" }

export const rowHint = (phase: Phase, hasRounds: boolean): string | null =>
    phase === "draft" ? "publish" : phase === "open" ? "see who's left" : phase === "closed" ? (hasRounds ? "check the rounds" : "review results") : null

// Rounds nest under their main ballot; a round whose main is not in the list stands alone. Empty groups are left out.
export function groupBallots(list: BallotSummary[], now: Date): ManageGroup[] {
    const ids = new Set(list.map((b) => b.id))
    const kids = new Map<string, BallotSummary[]>()
    const tops: BallotSummary[] = []
    for (const b of list) {
        if (b.parent_ballot_id && ids.has(b.parent_ballot_id)) kids.set(b.parent_ballot_id, [...(kids.get(b.parent_ballot_id) ?? []), b])
        else tops.push(b)
    }
    const out = new Map<GroupKey, ManageItem[]>()
    for (const b of tops) {
        const children = (kids.get(b.id) ?? []).sort((a, c) => a.opens_at.localeCompare(c.opens_at))
        const phase = phaseOf(b, now)
        const key = GROUP_OF[phase]
        out.set(key, [...(out.get(key) ?? []), { ballot: b, children, hint: rowHint(phase, children.length > 0) }])
    }
    return ORDER.filter((k) => out.has(k)).map((k) => ({ key: k, title: TITLE[k], items: out.get(k)!.sort((a, b) => a.ballot.closes_at.localeCompare(b.ballot.closes_at)) }))
}

// ---------------------------------------------------------------- stepper

export type Step = { label: string; state: "done" | "cur" | "todo" | "skip" }

export function stepperSteps(i: { phase: Phase; hasTiebreak: boolean; tiesNeeded: boolean; allDecided: boolean }): Step[] {
    const tb = i.hasTiebreak || i.tiesNeeded
    const cur = i.phase === "draft" ? 0 : i.phase === "scheduled" || i.phase === "open" ? 1 : i.phase === "released" ? 5 : tb && !i.allDecided ? 3 : i.allDecided ? 4 : 2
    return ["Draft", "Open", "Closed", "Tiebreak", "Decided", "Released"].map((label, idx) => ({
        label,
        state: idx === 3 && !tb && cur !== 3 ? "skip" : idx < cur ? "done" : idx === cur ? "cur" : "todo",
    }))
}

// ---------------------------------------------------------------- who voted

export const isFinished = (r: MemberCompletion): boolean => r.claimed && r.total > 0 && r.voted >= r.total

export function votedSummary(rows: MemberCompletion[]) {
    const claimed = rows.filter((r) => r.claimed)
    const finished = claimed.filter(isFinished).length
    const none = claimed.filter((r) => r.voted === 0).length
    // "finished" means every category voted; someone who skipped a category on purpose is "partial", not "not started"
    return { claimed: claimed.length, finished, left: claimed.length - finished, unclaimed: rows.length - claimed.length, none, partial: claimed.length - finished - none }
}

// Not finished first (fewest votes), then finished, then not signed up.
export const orderVoters = (rows: MemberCompletion[]): MemberCompletion[] => {
    const rank = (r: MemberCompletion) => (!r.claimed ? 2 : isFinished(r) ? 1 : 0)
    return [...rows].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.voted - b.voted : 0) || a.name.localeCompare(b.name))
}

export const leftNames = (rows: MemberCompletion[]): string[] => rows.filter((r) => r.claimed && !isFinished(r)).map((r) => r.name).sort((a, b) => a.localeCompare(b))

// ---------------------------------------------------------------- Next card

export type PrimaryId = "publish" | "see-left" | "start-tiebreak" | "start-committee" | "enter-winner" | "reveal" | "view-results" | "retry-record"
export type Next = { tone: PebbleName; heading: string; text: string; primary: { id: PrimaryId; label: string; disabled?: boolean } | null }

export type NextInput = {
    phase: Phase
    round: Ballot["round"]
    opensLabel: string
    closesLabel: string
    blockers: string[]
    finished: number
    claimed: number
    left: number
    none?: number // signed-up members with no votes at all
    partial?: number // members who voted some categories but not all
    recording: boolean
    recordError: boolean
    categoryCount: number
    decided: number // categories of this ballot with a recorded winner
    toEnter: number // categories where one committee member enters the winner
    tied: number // categories that need the next round and have none yet
    nextRound: "tiebreak" | "committee" | null
    roundRunning: boolean // a later round exists that is not finished
    allDecided: boolean // every main category has a winner
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

const missingLine = (i: Pick<NextInput, "left" | "none" | "partial">): string => {
    if (i.none === undefined || i.partial === undefined) return `${i.left} ${i.left === 1 ? "has" : "have"} votes missing.`
    const parts = [i.none > 0 && `${i.none} ${i.none === 1 ? "has" : "have"} not voted at all`, i.partial > 0 && `${i.partial} ${i.partial === 1 ? "has" : "have"} votes missing`].filter(Boolean)
    return parts.join(" and ") + "."
}

export function nextCard(i: NextInput): Next {
    if (i.phase === "draft")
        return {
            tone: "grape",
            heading: "Publish this ballot",
            text: i.blockers.length > 0 ? "Fix these first:" : `Members can vote the moment you publish, until ${i.closesLabel}.`,
            primary: { id: "publish", label: "Publish ballot", disabled: i.blockers.length > 0 },
        }
    if (i.phase === "scheduled") return { tone: "sky", heading: "Not open yet", text: `Members can vote from ${i.opensLabel} until ${i.closesLabel}. Nobody can vote yet.`, primary: null }
    if (i.phase === "open") {
        const nobody = i.left === 0
        return {
            tone: "lime",
            heading: nobody ? "Everyone has finished" : `${i.finished} of ${i.claimed} have finished`,
            text: nobody
                ? `Voting closes by itself ${i.closesLabel}.`
                : `${missingLine(i)} Voting closes by itself ${i.closesLabel}.`,
            primary: nobody ? null : { id: "see-left", label: "See who's left" },
        }
    }
    if (i.phase === "released") return { tone: "lemon", heading: "Winners are live for members", text: "Members see winners and nominees. Vote counts stay committee-only. Nothing left to do.", primary: { id: "view-results", label: "View as members see it" } }
    // closed
    if (i.recordError) return { tone: "cherry", heading: "Couldn't record the results", text: "Nothing was lost. Check your connection and try again.", primary: { id: "retry-record", label: "Try again" } }
    if (i.recording) return { tone: "tangerine", heading: "Recording results…", text: "Counting the votes and saving a winner for every category that has one.", primary: null }
    if (i.toEnter > 0)
        return {
            tone: "cherry",
            heading: i.round === "committee" ? `${i.decided} of ${plural(i.categoryCount, "category", "categories")} decided` : `Enter ${plural(i.toEnter, "winner")}`,
            text: i.round === "committee" ? "There is no committee vote. One committee member enters the winner for each category below." : "These categories need a winner picked by hand.",
            primary: { id: "enter-winner", label: "Enter the winner" },
        }
    if (i.tied > 0 && i.nextRound)
        return {
            tone: "tangerine",
            heading: `${plural(i.tied, "tie")} for first place`,
            text: i.nextRound === "tiebreak" ? "Only the tied nominees go to a tiebreak. Every other winner is already saved." : "The tiebreak is still tied. One committee member picks each winner.",
            primary: i.nextRound === "tiebreak" ? { id: "start-tiebreak", label: "Start tiebreak" } : { id: "start-committee", label: "Start committee round" },
        }
    if (i.roundRunning) return { tone: "sky", heading: "Continue in the next round", text: "Switch to it above. Winners are saved here as the round decides them.", primary: null }
    if (i.allDecided) return { tone: "strawberry", heading: "Every category has a winner", text: "Ready for the ceremony. Reveal is for the whole season and cannot be undone.", primary: { id: "reveal", label: "Check before reveal" } }
    return { tone: "tangerine", heading: "Results are saved", text: "Other ballots in this season still need winners before the reveal.", primary: null }
}
