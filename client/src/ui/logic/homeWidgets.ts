export type WidgetId = "ceremony" | "countdown" | "pending" | "progress" | "leaderboardPeek" | "latestWinners" | "notVoted" | "attention" | "quickActions"

export type WidgetDef = {
    id: WidgetId
    title: string
    adminOnly: boolean
    requiresRelease: boolean
    defaultMember: boolean
    defaultCommittee: boolean
    span: 1 | 2
}

// Default order. adminOnly widgets are committee-only: resolveWidgets drops them for everyone else.
export const WIDGETS: readonly WidgetDef[] = [
    { id: "ceremony", title: "Oscar night", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2 },
    { id: "countdown", title: "Countdown", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: false, span: 1 },
    { id: "pending", title: "Your ballots", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2 },
    { id: "progress", title: "Your progress", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 1 },
    { id: "latestWinners", title: "Latest winners", adminOnly: false, requiresRelease: false, defaultMember: true, defaultCommittee: true, span: 2 },
    { id: "leaderboardPeek", title: "Leaderboard", adminOnly: false, requiresRelease: true, defaultMember: true, defaultCommittee: true, span: 2 },
    { id: "notVoted", title: "Who hasn't voted", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 2 },
    { id: "attention", title: "Needs your attention", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 2 },
    { id: "quickActions", title: "Quick actions", adminOnly: true, requiresRelease: false, defaultMember: false, defaultCommittee: true, span: 2 },
]

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
