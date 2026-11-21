import type { PebbleName } from "../tokens"

export type WidgetId =
    | "ceremony" | "countdown" | "pending" | "ballotCloses" | "progress" | "yourStats" | "leaderboardPeek" | "latestWinners"
    | "notVoted" | "attention" | "ballotHealth" | "tiebreak" | "revealReadiness"

/** The pebble used for the widget's accent edge and its Customize dot. */
export type WidgetColor = PebbleName

export type WidgetDef = {
    id: WidgetId
    title: string
    /** One line shown under the title in Customize. */
    blurb: string
    adminOnly: boolean
    requiresRelease: boolean
    defaultMember: boolean
    defaultCommittee: boolean
    span: 1 | 2
    color: WidgetColor
}

// Default order. adminOnly widgets are committee-only: resolveWidgets drops them for everyone else.
export const WIDGETS: readonly WidgetDef[] = [
    { id: "ceremony", title: "Oscar night", blurb: "Date, place, calendar", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2, color: "lemon" },
    { id: "countdown", title: "Countdown", blurb: "Days until the ceremony", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: false, span: 1, color: "grape" },
    { id: "pending", title: "Your ballots", blurb: "Ballots you still need to vote on", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2, color: "lime" },
    { id: "ballotCloses", title: "Ballot closes", blurb: "When the next ballot closes", adminOnly: false, requiresRelease: false, defaultMember: false, defaultCommittee: false, span: 1, color: "cherry" },
    { id: "progress", title: "Your progress", blurb: "Votes you've cast so far", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 1, color: "sky" },
    { id: "yourStats", title: "Your stats", blurb: "Your picks and win rate", adminOnly: false, requiresRelease: true, defaultMember: false, defaultCommittee: false, span: 1, color: "grape" },
    { id: "latestWinners", title: "Latest winners", blurb: "Who just won", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2, color: "tangerine" },
    { id: "leaderboardPeek", title: "Leaderboard", blurb: "Top of the standings", adminOnly: false, requiresRelease: true, defaultMember: true, defaultCommittee: true, span: 2, color: "strawberry" },
    { id: "notVoted", title: "Who hasn't voted", blurb: "Members who haven't voted yet", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 2, color: "grape" },
    { id: "attention", title: "Needs your attention", blurb: "Things that need a committee decision", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 2, color: "cherry" },
    { id: "ballotHealth", title: "Ballot health", blurb: "How complete the ballot is", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 1, color: "strawberry" },
    { id: "tiebreak", title: "Tiebreak status", blurb: "Ties that need a call", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: false, span: 1, color: "lime" },
    { id: "revealReadiness", title: "Reveal readiness", blurb: "Checks before results go live", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: false, span: 1, color: "lemon" },
]

export const widgetColor = (id: WidgetId): WidgetColor => WIDGETS.find((w) => w.id === id)?.color ?? "lemon"

export type HomeCtx = { isCommittee: boolean; released: boolean }

// Minimal structural type so this file does not depend on homePrefs (which depends on it).
type PrefsLike = { order: readonly WidgetId[]; hidden: readonly WidgetId[] }

// Order from prefs (or the registry order), hidden dropped, admin-only dropped unless committee
// (checked HERE, so saved prefs can never grant access), release-gated dropped until released.
export function resolveWidgets(prefs: PrefsLike | null, ctx: HomeCtx): WidgetDef[] {
    const byId = new Map(WIDGETS.map((w) => [w.id, w]))
    const order = prefs ? prefs.order : WIDGETS.filter((w) => (ctx.isCommittee ? w.defaultCommittee : w.defaultMember)).map((w) => w.id)
    const hidden = new Set(prefs?.hidden ?? [])
    const seen = new Set<WidgetId>()
    const out: WidgetDef[] = []
    for (const id of order) {
        const w = byId.get(id)
        if (!w || seen.has(id)) continue
        seen.add(id)
        if (hidden.has(id)) continue
        if (w.adminOnly && !ctx.isCommittee) continue
        if (w.requiresRelease && !ctx.released) continue
        out.push(w)
    }
    return out
}
