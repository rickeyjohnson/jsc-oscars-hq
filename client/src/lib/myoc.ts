import type { Category, Member, NomineeMode } from "../types"
import { closesInLabel } from "./time"

export const NAME_MAX = 80
export const DESC_MAX = 300
export const MYOC_UNAVAILABLE = "Make Your Own Categories isn't available yet."
export const MYOC_OLD_LIMIT = "Make Your Own Categories still has the old limit; ask a committee member to apply the update."
export const MYOC_LOAD_FAILED = "Couldn't load Make Your Own Categories. Check your connection and try again."

export type MyocHint = "person" | "group" | "thing" | "other"
export type MyocStatus = "submitted" | "withdrawn" | "accepted" | "rejected" | "merged"
export type MyocWindow = { id: string; season_id: string; opens_at: string; closes_at: string }
export type MyocIdea = {
    id: string
    window_id: string
    author_id: string
    name: string
    description: string
    hint: MyocHint | null
    status: MyocStatus
    merged_into: string | null
    assigned_category: string | null
    created_at: string
    updated_at: string
}
/** Committee view: the idea plus who sent it. Members never get this. */
export type ReviewIdea = MyocIdea & { author: { id: string | null; name: string } }

export const HINTS: { value: MyocHint; label: string }[] = [
    { value: "person", label: "A person" },
    { value: "group", label: "A group" },
    { value: "thing", label: "A thing" },
    { value: "other", label: "Something else" },
]
export const hintLabel = (h: MyocHint | null): string | null => HINTS.find((x) => x.value === h)?.label ?? null

// ---------------------------------------------------------------- windows

export type WindowPhase = "none" | "upcoming" | "open" | "closed"

export function windowPhase(w: Pick<MyocWindow, "opens_at" | "closes_at"> | null, now: Date): WindowPhase {
    if (!w) return "none"
    if (now.getTime() < new Date(w.opens_at).getTime()) return "upcoming"
    return now.getTime() < new Date(w.closes_at).getTime() ? "open" : "closed"
}

/** The window the page talks about: the open one, else the soonest upcoming, else the most recent closed. */
export function pickWindow(windows: MyocWindow[], now: Date): MyocWindow | null {
    const by = (p: WindowPhase) => windows.filter((w) => windowPhase(w, now) === p)
    const open = by("open").sort((a, b) => a.closes_at.localeCompare(b.closes_at))[0]
    if (open) return open
    const upcoming = by("upcoming").sort((a, b) => a.opens_at.localeCompare(b.opens_at))[0]
    if (upcoming) return upcoming
    return by("closed").sort((a, b) => b.closes_at.localeCompare(a.closes_at))[0] ?? null
}

export type MyocHomeView = { kind: "open"; closes: Date; sent: number } | { kind: "upcoming"; opens: Date }

/** What the Home card shows: an open window (with the member's idea count), a scheduled one, or null (hide the card). */
export function myocHomeView(w: MyocWindow | null, sent: number, now: Date): MyocHomeView | null {
    const phase = windowPhase(w, now)
    if (!w) return null
    if (phase === "open") return { kind: "open", closes: new Date(w.closes_at), sent }
    if (phase === "upcoming") return { kind: "upcoming", opens: new Date(w.opens_at) }
    return null
}

export const closesLabel = (w: MyocWindow, now: Date): string => closesInLabel(new Date(w.closes_at), now)

/** null when fine, else why the picked times cannot make a window (datetime-local strings). */
export function windowProblem(opens: string, closes: string, now: Date, opts: { requireFutureClose?: boolean } = { requireFutureClose: true }): string | null {
    const o = new Date(opens).getTime()
    const c = new Date(closes).getTime()
    if (!opens || Number.isNaN(o)) return "Pick when it opens"
    if (!closes || Number.isNaN(c)) return "Pick when it closes"
    if (c <= o) return "It has to close after it opens"
    if (opts.requireFutureClose && c <= now.getTime()) return "Pick a close time in the future"
    return null
}

// ---------------------------------------------------------------- ideas (member side)

export type IdeaDraft = { name: string; description: string; hint: MyocHint | null }
export type IdeaErrors = { name?: string; description?: string }

export function validateIdea(d: Pick<IdeaDraft, "name" | "description">): IdeaErrors {
    const out: IdeaErrors = {}
    const n = d.name.trim().length
    if (n === 0) out.name = "Give it a name"
    else if (n > NAME_MAX) out.name = `Keep the name to ${NAME_MAX} characters`
    if (d.description.length > DESC_MAX) out.description = `Keep it to ${DESC_MAX} characters`
    return out
}
export const hasErrors = (e: IdeaErrors): boolean => Boolean(e.name || e.description)


/** Members only ever see "Submitted" or "Withdrawn": the committee's decision is never shown to them. */
export const memberStatusLabel = (s: MyocStatus): "Submitted" | "Withdrawn" => (s === "withdrawn" ? "Withdrawn" : "Submitted")
/** Edit and withdraw exist only while the window is open and the committee has not acted. */
export const canChange = (i: Pick<MyocIdea, "status">, phase: WindowPhase): boolean => phase === "open" && i.status === "submitted"

// ---------------------------------------------------------------- errors

export type MyocErrorKind = "unavailable" | "old-limit" | "closed" | "other"
export function myocErrorKind(e: unknown): MyocErrorKind {
    const err = e as { code?: string; message?: string } | null
    const msg = String(err?.message ?? "")
    if (err?.code === "PGRST205" || err?.code === "42P01" || /could not find the table|schema cache|relation .* does not exist/i.test(msg)) return "unavailable"
    if (/suggestion limit reached/i.test(msg)) return "old-limit"
    if (/suggestions are (not open|closed)/i.test(msg)) return "closed"
    return "other"
}
export function myocMessage(e: unknown, fallback = "Couldn't save that. Check your connection and try again."): string {
    const k = myocErrorKind(e)
    if (k === "unavailable") return MYOC_UNAVAILABLE
    if (k === "old-limit") return MYOC_OLD_LIMIT
    if (k === "closed") return "Make Your Own Categories isn't open right now."
    return fallback
}

// ---------------------------------------------------------------- committee review

export type ReviewFilter = "all" | "new" | "accepted" | "rejected" | "merged" | "withdrawn"
export const FILTERS: { value: ReviewFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "accepted", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
    { value: "merged", label: "Merged" },
    { value: "withdrawn", label: "Withdrawn" },
]
const FILTER_STATUS: Record<Exclude<ReviewFilter, "all">, MyocStatus> = { new: "submitted", accepted: "accepted", rejected: "rejected", merged: "merged", withdrawn: "withdrawn" }

export const filterIdeas = <T extends Pick<MyocIdea, "status">>(ideas: T[], f: ReviewFilter): T[] => (f === "all" ? ideas : ideas.filter((i) => i.status === FILTER_STATUS[f]))
export function filterCounts(ideas: Pick<MyocIdea, "status">[]): Record<ReviewFilter, number> {
    const out: Record<ReviewFilter, number> = { all: ideas.length, new: 0, accepted: 0, rejected: 0, merged: 0, withdrawn: 0 }
    for (const i of ideas) for (const [f, s] of Object.entries(FILTER_STATUS)) if (i.status === s) out[f as ReviewFilter] += 1
    return out
}

export type ReviewAction = { label: string; status: MyocStatus | "keep" }
/** The footer buttons for an idea, by its current status: primary first, at most one secondary. Withdrawn is read-only. */
export function reviewActions(status: MyocStatus): { primary: ReviewAction; secondary?: ReviewAction } | null {
    switch (status) {
        case "submitted":
            return { primary: { label: "Accept", status: "accepted" }, secondary: { label: "Reject", status: "rejected" } }
        case "accepted":
            return { primary: { label: "Save changes", status: "keep" }, secondary: { label: "Reject", status: "rejected" } }
        case "rejected":
            return { primary: { label: "Accept", status: "accepted" }, secondary: { label: "Save changes", status: "keep" } }
        case "merged":
            return { primary: { label: "Unmerge", status: "submitted" }, secondary: { label: "Save changes", status: "keep" } }
        default:
            return null
    }
}

/** Ideas you can merge `idea` into: same window, not itself, not withdrawn, not already merged away. */
export const mergeTargets = <T extends Pick<MyocIdea, "id" | "window_id" | "status">>(ideas: T[], idea: Pick<MyocIdea, "id" | "window_id">): T[] =>
    ideas.filter((i) => i.id !== idea.id && i.window_id === idea.window_id && i.status !== "withdrawn" && i.status !== "merged")

/** Attach the submitter (committee only). */
export function withAuthors(ideas: MyocIdea[], members: Pick<Member, "id" | "name" | "user_id">[]): ReviewIdea[] {
    const byUser = new Map(members.filter((m) => m.user_id).map((m) => [m.user_id as string, m]))
    return ideas.map((i) => {
        const m = byUser.get(i.author_id)
        return { ...i, author: { id: m?.id ?? null, name: m?.name ?? "Unknown member" } }
    })
}

// ---------------------------------------------------------------- hand-off to the builder

/** A hint decides how the category's options start; the committee finishes the options in the builder. */
export function hintToMode(h: MyocHint | null): { nominee_mode: NomineeMode; allow_member_add: boolean } {
    if (h === "group") return { nominee_mode: "group", allow_member_add: false }
    if (h === "thing") return { nominee_mode: "preset", allow_member_add: true }
    return { nominee_mode: "everyone", allow_member_add: false }
}

export const acceptedIdeas = <T extends Pick<MyocIdea, "status">>(ideas: T[]): T[] => ideas.filter((i) => i.status === "accepted")

/** Accepted ideas in builder order: grouped by assigned category (unassigned last), oldest first inside a group. */
export function sortForBuilder<T extends Pick<MyocIdea, "assigned_category" | "created_at">>(ideas: T[]): T[] {
    const key = (i: T) => (i.assigned_category?.trim() ? i.assigned_category.trim().toLowerCase() : "\uffff")
    return [...ideas].sort((a, b) => key(a).localeCompare(key(b)) || a.created_at.localeCompare(b.created_at))
}

export type BuilderIdea = { name: string; description: string; hint: MyocHint | null }
export const toBuilderIdeas = (ideas: Pick<MyocIdea, "name" | "description" | "hint">[]): BuilderIdea[] => ideas.map((i) => ({ name: i.name.trim(), description: i.description.trim(), hint: i.hint }))

/** Draft categories for the builder. Same name dedupe as bulk import (case-insensitive, against `existingNames` and each other). */
export function toDraftCategories(ideas: BuilderIdea[], existingNames: string[] = []): { categories: Category[]; skipped: string[] } {
    const seen = new Set(existingNames.map((n) => n.trim().toLowerCase()))
    const categories: Category[] = []
    const skipped: string[] = []
    for (const i of ideas) {
        const key = i.name.trim().toLowerCase()
        if (!key) continue
        if (seen.has(key)) {
            skipped.push(i.name)
            continue
        }
        seen.add(key)
        categories.push({ id: crypto.randomUUID(), name: i.name, description: i.description, order: existingNames.length + categories.length, ...hintToMode(i.hint), nominees: [], source: "myoc" })
    }
    return { categories, skipped }
}

/** Router state handed to /app/profile/ballots/create. Anything malformed is ignored. */
export type BuilderState = { myocIdeas: BuilderIdea[] }
export function readBuilderState(state: unknown): BuilderIdea[] {
    const raw = (state as { myocIdeas?: unknown } | null)?.myocIdeas
    if (!Array.isArray(raw)) return []
    return raw.flatMap((r) => {
        const o = r as Partial<BuilderIdea> | null
        if (!o || typeof o.name !== "string" || !o.name.trim()) return []
        const hint = HINTS.some((h) => h.value === o.hint) ? (o.hint as MyocHint) : null
        return [{ name: o.name, description: typeof o.description === "string" ? o.description : "", hint }]
    })
}

/** Plain text for pasting elsewhere: one idea per line, "Name (Person) - description [from Author]". Withdrawn ideas are left out. */
export function ideasToText(ideas: Pick<ReviewIdea, "name" | "description" | "hint" | "status" | "author">[]): string {
    return ideas
        .filter((i) => i.status !== "withdrawn")
        .map((i, n) => {
            const hint = hintLabel(i.hint)
            const desc = i.description.trim()
            return `${n + 1}. ${i.name.trim()}${hint ? ` (${hint})` : ""}${desc ? ` - ${desc}` : ""} [from ${i.author.name}]`
        })
        .join("\n")
}
