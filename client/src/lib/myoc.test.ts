import { describe, expect, it } from "vitest"
import {
    acceptedIdeas, canChange, filterCounts, filterIdeas, hintToMode, mergeTargets, memberStatusLabel, myocErrorKind, myocMessage, MYOC_UNAVAILABLE,
    pickWindow, readBuilderState, sortForBuilder, reviewActions, slotsLeft, toDraftCategories, validateIdea, windowPhase, windowProblem, withAuthors,
    type MyocIdea, type MyocWindow,
} from "./myoc"

const NOW = new Date("2026-12-01T12:00:00Z")
const hrs = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString()
const win = (id: string, o: number, c: number): MyocWindow => ({ id, season_id: "S", opens_at: hrs(o), closes_at: hrs(c) })
const idea = (id: string, over: Partial<MyocIdea> = {}): MyocIdea => ({
    id, window_id: "W", author_id: "u1", name: id, description: "", hint: null, status: "submitted", merged_into: null, assigned_category: null, created_at: "", updated_at: "", ...over,
})

describe("windows", () => {
    it("phases", () => {
        expect(windowPhase(null, NOW)).toBe("none")
        expect(windowPhase(win("a", 1, 2), NOW)).toBe("upcoming")
        expect(windowPhase(win("a", -1, 2), NOW)).toBe("open")
        expect(windowPhase(win("a", -3, -1), NOW)).toBe("closed")
        expect(windowPhase(win("a", 0, 2), NOW)).toBe("open") // opens_at <= now
        expect(windowPhase(win("a", -2, 0), NOW)).toBe("closed") // now < closes_at is false
    })
    it("picks open, then soonest upcoming, then latest closed", () => {
        const closedOld = win("old", -50, -40), closedNew = win("new", -30, -20), up1 = win("up1", 5, 9), up2 = win("up2", 2, 9), open = win("open", -1, 3)
        expect(pickWindow([closedOld, closedNew, up1, open], NOW)?.id).toBe("open")
        expect(pickWindow([closedOld, up1, up2], NOW)?.id).toBe("up2")
        expect(pickWindow([closedOld, closedNew], NOW)?.id).toBe("new")
        expect(pickWindow([], NOW)).toBeNull()
    })
    it("windowProblem", () => {
        expect(windowProblem("", "2026-12-05T10:00", NOW)).toMatch(/opens/)
        expect(windowProblem("2026-12-05T10:00", "2026-12-04T10:00", NOW)).toMatch(/after it opens/)
        expect(windowProblem("2026-11-01T10:00", "2026-11-02T10:00", NOW)).toMatch(/future/)
        expect(windowProblem("2026-12-02T10:00", "2026-12-06T10:00", NOW)).toBeNull()
    })
})

describe("member side", () => {
    it("validates name and description", () => {
        expect(validateIdea({ name: "  ", description: "" }).name).toBeTruthy()
        expect(validateIdea({ name: "x".repeat(81), description: "" }).name).toMatch(/80/)
        expect(validateIdea({ name: "ok", description: "y".repeat(301) }).description).toMatch(/300/)
        expect(validateIdea({ name: "ok", description: "y".repeat(300) })).toEqual({})
    })
    it("withdrawn ideas free a slot; the limit is 5", () => {
        const six = ["a", "b", "c", "d", "e"].map((i) => idea(i))
        expect(slotsLeft(six)).toBe(0)
        expect(slotsLeft([...six.slice(1), idea("w", { status: "withdrawn" })])).toBe(1)
        expect(slotsLeft([])).toBe(5)
    })
    it("never shows accepted, rejected or merged to members", () => {
        expect(memberStatusLabel("submitted")).toBe("Submitted")
        for (const s of ["accepted", "rejected", "merged"] as const) expect(memberStatusLabel(s)).toBe("Submitted")
        expect(memberStatusLabel("withdrawn")).toBe("Withdrawn")
    })
    it("canChange only while open and untouched", () => {
        expect(canChange(idea("a"), "open")).toBe(true)
        expect(canChange(idea("a"), "closed")).toBe(false)
        expect(canChange(idea("a", { status: "withdrawn" }), "open")).toBe(false)
        expect(canChange(idea("a", { status: "accepted" }), "open")).toBe(false)
    })
})

describe("errors", () => {
    it("classifies", () => {
        expect(myocErrorKind({ code: "PGRST205", message: "Could not find the table 'public.myoc_windows' in the schema cache" })).toBe("unavailable")
        expect(myocErrorKind({ code: "42P01", message: "relation \"myoc_ideas\" does not exist" })).toBe("unavailable")
        expect(myocErrorKind({ message: "suggestion limit reached" })).toBe("limit")
        expect(myocErrorKind({ message: "suggestions are not open" })).toBe("closed")
        expect(myocErrorKind(new Error("boom"))).toBe("other")
        expect(myocMessage({ code: "PGRST205", message: "x" })).toBe(MYOC_UNAVAILABLE)
        expect(myocMessage({ message: "suggestion limit reached" })).toMatch(/Withdraw one/)
    })
})

describe("review", () => {
    const ideas = [idea("a"), idea("b", { status: "accepted" }), idea("c", { status: "accepted" }), idea("d", { status: "rejected" }), idea("e", { status: "merged", merged_into: "b" }), idea("f", { status: "withdrawn" })]
    it("filters and counts", () => {
        expect(filterIdeas(ideas, "all")).toHaveLength(6)
        expect(filterIdeas(ideas, "new").map((i) => i.id)).toEqual(["a"])
        expect(filterIdeas(ideas, "accepted").map((i) => i.id)).toEqual(["b", "c"])
        expect(filterCounts(ideas)).toEqual({ all: 6, new: 1, accepted: 2, rejected: 1, merged: 1, withdrawn: 1 })
        expect(acceptedIdeas(ideas)).toHaveLength(2)
    })
    it("actions by status; withdrawn is read-only", () => {
        expect(reviewActions("submitted")).toEqual({ primary: { label: "Accept", status: "accepted" }, secondary: { label: "Reject", status: "rejected" } })
        expect(reviewActions("accepted")?.primary.status).toBe("keep")
        expect(reviewActions("merged")?.primary).toEqual({ label: "Unmerge", status: "submitted" })
        expect(reviewActions("withdrawn")).toBeNull()
    })
    it("merge targets exclude itself, withdrawn, merged and other windows", () => {
        const all = [...ideas, idea("g", { window_id: "W2" })]
        expect(mergeTargets(all, idea("a")).map((i) => i.id)).toEqual(["b", "c", "d"])
    })
    it("attaches the submitter by member user_id", () => {
        const out = withAuthors([idea("a", { author_id: "u9" }), idea("b", { author_id: "nobody" })], [{ id: "m1", name: "Micah", user_id: "u9" }])
        expect(out[0].author).toEqual({ id: "m1", name: "Micah" })
        expect(out[1].author.name).toBe("Unknown member")
    })
})

describe("hand-off", () => {
    it("maps hints to builder modes", () => {
        expect(hintToMode("person")).toEqual({ nominee_mode: "everyone", allow_member_add: false })
        expect(hintToMode("group")).toEqual({ nominee_mode: "group", allow_member_add: false })
        expect(hintToMode("thing")).toEqual({ nominee_mode: "preset", allow_member_add: true })
        expect(hintToMode(null).nominee_mode).toBe("everyone")
        expect(hintToMode("other").nominee_mode).toBe("everyone")
    })
    it("builds MYOC-tagged drafts, deduping names", () => {
        const { categories, skipped } = toDraftCategories(
            [{ name: "Best Lurker", description: "d", hint: "person" }, { name: "best lurker", description: "", hint: null }, { name: "Existing", description: "", hint: null }, { name: "Best Snack", description: "", hint: "thing" }],
            ["existing"],
        )
        expect(categories.map((c) => c.name)).toEqual(["Best Lurker", "Best Snack"])
        expect(skipped).toEqual(["best lurker", "Existing"])
        expect(categories.every((c) => c.source === "myoc" && c.nominees.length === 0)).toBe(true)
        expect(categories.map((c) => c.order)).toEqual([1, 2])
        expect(categories[1]).toMatchObject({ nominee_mode: "preset", allow_member_add: true })
    })
    it("orders by assigned category, unassigned last, then oldest first", () => {
        const a = idea("a", { assigned_category: "Zed", created_at: "1" }), b = idea("b", { created_at: "0" }), c = idea("c", { assigned_category: "alpha", created_at: "9" }), d = idea("d", { assigned_category: "alpha", created_at: "2" })
        expect(sortForBuilder([a, b, c, d]).map((i) => i.id)).toEqual(["d", "c", "a", "b"])
    })
    it("ignores malformed router state", () => {
        expect(readBuilderState(null)).toEqual([])
        expect(readBuilderState({ myocIdeas: "x" })).toEqual([])
        expect(readBuilderState({ myocIdeas: [{ name: "A", description: 3, hint: "bogus" }, { name: " " }, null] })).toEqual([{ name: "A", description: "", hint: null }])
    })
})
