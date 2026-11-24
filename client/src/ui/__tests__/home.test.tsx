// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { HomeState } from "../../pages/home/useHomeData"
import type { HomeData } from "../logic/homeData"
import type { BallotSummary } from "../../lib/voting"

const hook = vi.hoisted(() => ({ state: null as unknown, committee: false }))
vi.mock("../../pages/home/useHomeData", () => ({
    useHomeData: (c: boolean) => {
        hook.committee = c
        return hook.state
    },
}))
const profile = vi.hoisted(() => ({ is_committee: false }))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }))
// MYOC has its own tests (homeMyoc.test.tsx); here it resolves to "nothing to show" so the default widget counts stay 5.
vi.mock("../../pages/home/useMyocHome", () => ({ useMyocHome: () => null }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { ...profile, image_url: "x", display_name: "Rico Johnson" }, member: { id: "m1", name: "Rico", user_id: "u1" }, loading: false }) }))
vi.mock("../../supabaseClient", () => ({
    supabase: { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { image_url: "x" }, error: null }) }) }) }) },
}))

import HomePage from "../../pages/HomePage"

const DAY = 86_400_000
const ballot = (o: Partial<BallotSummary> = {}): BallotSummary => ({
    id: "b1", season_id: "S", parent_ballot_id: null, name: "Main Ballot", round: "main", status: "open",
    opens_at: new Date(Date.now() - DAY).toISOString(), closes_at: new Date(Date.now() + 3 * DAY + 60_000).toISOString(),
    category_count: 5, my_vote_count: 2, ...o,
})
const data = (o: Partial<HomeData> = {}): HomeData => ({
    season: { id: "S", name: "Fall", ceremony_at: new Date(Date.now() + 20 * DAY).toISOString(), location: "Langston's place", results_released_at: null },
    released: false, summaries: [ballot()], results: null, ballots: null, checks: null, completion: null, errors: {}, ...o,
})
const ready = (d: HomeData, extra: Partial<HomeState> = {}): HomeState => ({ data: d, loading: false, error: null, reload: vi.fn(), directory: null, ...extra })

const mem = new Map<string, string>()
const renderHome = () => render(<MemoryRouter><HomePage /></MemoryRouter>)
const headings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)

beforeEach(() => {
    mem.clear()
    mem.set("jsc.firstRunGuide.v1.u1", "1")
    vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) })
    profile.is_committee = false
    hook.state = ready(data())
})
afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe("Home widgets", () => {
    it("member sees the 5 default widgets and no committee widgets, even with saved committee prefs", () => {
        mem.set("jsc.home.v1.u1", JSON.stringify({ version: 1, order: ["notVoted", "attention", "ballotHealth", "ceremony", "countdown", "pending", "progress", "latestWinners", "leaderboardPeek"], hidden: [] }))
        renderHome()
        const h = headings()
        expect(h).toEqual(expect.arrayContaining(["Oscar night", "Countdown", "Your ballots", "Your progress", "Latest winners"]))
        expect(h).toHaveLength(5)
        expect(screen.queryByRole("heading", { name: /who hasn't voted/i })).toBeNull()
        expect(screen.getByText("Hey Rico.")).toBeTruthy()
    })

    it("committee sees 7 widgets including the attention item", () => {
        profile.is_committee = true
        hook.state = ready(data({
            ballots: [{ ...ballot(), closes_at: new Date(Date.now() - DAY).toISOString() }],
            checks: [{ id: "ballots_closed", ok: false, label: "Ballots still open" }] as never,
            completion: { ballot: ballot(), members: [{ name: "Nick", voted: 0, total: 5, claimed: true }, { name: "TJ", voted: 4, total: 5, claimed: true }] },
        }))
        renderHome()
        expect(headings()).toHaveLength(7)
        const att = screen.getByRole("region", { name: "Needs your attention" })
        expect(within(att).getByText(/ended but is still open/)).toBeTruthy()
        const nv = screen.getByRole("region", { name: "Who hasn't voted" })
        expect(within(nv).getByRole("img", { name: "Nick" })).toBeTruthy()
        expect(within(nv).getByRole("img", { name: "TJ" })).toBeTruthy()
        expect(within(nv).getAllByRole("columnheader")).toHaveLength(2)
    })

    it("Your ballots is a list: name, when it closes, X/Y voted; row links, no buttons", () => {
        renderHome()
        const r = screen.getByRole("region", { name: "Your ballots" })
        expect(within(r).getByText("Main Ballot")).toBeTruthy()
        expect(within(r).getByText(/^Closes in /)).toBeTruthy()
        expect(within(r).getByText(/\d\/5 voted/)).toBeTruthy()
        expect((within(r).getByRole("link", { name: /Main Ballot/ }) as HTMLAnchorElement).getAttribute("href")).toBe("/app/ballots/b1")
        expect(within(r).queryByRole("button")).toBeNull()
    })

    it("a fully voted ballot still shows, as All voted, after the unfinished ones; max 5 rows then +N more", () => {
        const mk = (id: string, voted: number, hrs: number) => ballot({ id, name: `B${id}`, my_vote_count: voted, closes_at: new Date(Date.now() + hrs * 3_600_000 + 60_000).toISOString() })
        hook.state = ready(data({ summaries: [mk("1", 5, 1), mk("2", 0, 5), mk("3", 0, 4), mk("4", 0, 3), mk("5", 0, 2), mk("6", 0, 6), mk("7", 0, 7)] }))
        renderHome()
        const r = screen.getByRole("region", { name: "Your ballots" })
        expect(within(r).getAllByRole("link")).toHaveLength(5)
        expect(within(r).getByText("+2 more")).toBeTruthy()
        expect(within(r).queryByText("All voted")).toBeNull() // the finished one is last, past the 5th row
    })

    it("pending empty state links to Ballots", () => {
        hook.state = ready(data({ summaries: [ballot({ status: "closed", closes_at: new Date(Date.now() - DAY).toISOString() })] }))
        renderHome()
        expect(screen.getByText("Nothing to vote on yet.")).toBeTruthy()
        expect((screen.getByRole("link", { name: "Your ballots" }) as HTMLAnchorElement).getAttribute("href")).toBe("/app/ballots")
    })

    it("customize: hiding Countdown removes it and persists; Move up reorders; reset restores", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        const sw = screen.getByRole("switch", { name: "Countdown" })
        expect(sw.getAttribute("aria-checked")).toBe("true")
        fireEvent.click(sw)
        expect(screen.getByRole("switch", { name: "Countdown" }).getAttribute("aria-checked")).toBe("false")
        expect(JSON.parse(mem.get("jsc.home.v1.u1")!).hidden).toContain("countdown")
        fireEvent.click(screen.getByRole("button", { name: "Close" }))
        expect(screen.queryByRole("heading", { name: "Countdown", level: 2 })).toBeNull()

        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        fireEvent.click(screen.getByRole("button", { name: "Move Your ballots up" }))
        const order = JSON.parse(mem.get("jsc.home.v1.u1")!).order as string[]
        expect(order.indexOf("pending")).toBeLessThan(order.indexOf("countdown"))
        expect(screen.queryByText("COMMITTEE ONLY")).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: /reset to default/i }))
        expect(JSON.parse(mem.get("jsc.home.v1.u1")!).hidden).not.toContain("countdown")
    })

    it("committee customize sheet has the COMMITTEE ONLY group", () => {
        profile.is_committee = true
        hook.state = ready(data())
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        expect(screen.getByText("COMMITTEE ONLY")).toBeTruthy()
        expect(screen.getByRole("switch", { name: "Ballot health" })).toBeTruthy()
    })

    it("a failing widget fetch shows its own error with retry and leaves the others", () => {
        profile.is_committee = true
        const reload = vi.fn()
        hook.state = ready(data({ errors: { completion: new Error("x") } }), { reload })
        renderHome()
        const nv = screen.getByRole("region", { name: "Who hasn't voted" })
        fireEvent.click(within(nv).getByRole("button", { name: /try again/i }))
        expect(reload).toHaveBeenCalled()
        expect(screen.getByRole("region", { name: "Your ballots" }).textContent).toMatch(/voted/)
        expect(within(screen.getByRole("region", { name: "Oscar night" })).getByRole("button", { name: /^Add to calendar, / })).toBeTruthy()
    })

    it("shows loading skeletons per widget", () => {
        hook.state = { data: null, loading: true, error: null, reload: vi.fn(), directory: null }
        renderHome()
        // 5 defaults plus the release-gated Leaderboard slot, so it cannot pop in after the load
        expect(screen.getAllByRole("status")).toHaveLength(6)
        expect(screen.getByRole("status", { name: /loading countdown/i })).toBeTruthy()
        expect(screen.getByRole("status", { name: /loading leaderboard/i })).toBeTruthy()
    })

    it("a gated widget slot that is not released drops out once the load answers", () => {
        hook.state = ready(data({ released: false }))
        renderHome()
        expect(screen.queryByRole("region", { name: "Leaderboard" })).toBeNull()
        expect(screen.queryByRole("status", { name: /loading leaderboard/i })).toBeNull()
    })

    it("a whole-load failure shows exactly one Try again; partial failures stay per widget", () => {
        const reload = vi.fn()
        profile.is_committee = true
        hook.state = { data: null, loading: false, error: new Error("offline"), reload, directory: null }
        renderHome()
        const retry = screen.getAllByRole("button", { name: /try again/i })
        expect(retry).toHaveLength(1)
        expect(screen.getByText("Couldn't load Home")).toBeTruthy()
        fireEvent.click(retry[0])
        expect(reload).toHaveBeenCalledTimes(1)
    })

    it("null ceremony date disables Add to calendar with an explanation; null location hides directions", () => {
        hook.state = ready(data({ season: { id: "S", name: "Fall", ceremony_at: null, location: null, results_released_at: null } }))
        renderHome()
        const btn = screen.getByRole("button", { name: "Add to calendar" }) as HTMLButtonElement
        expect(btn.disabled).toBe(true)
        expect(screen.getByText(/date isn't set yet/i)).toBeTruthy()
        expect(screen.queryByRole("link", { name: /directions/i })).toBeNull()
        expect(screen.queryByText(/📍/)).toBeNull()
    })

    it("Directions encodes the location; Add to calendar downloads an .ics Blob", () => {
        const create = vi.fn(() => "blob:x")
        URL.createObjectURL = create
        URL.revokeObjectURL = vi.fn()
        renderHome()
        const link = screen.getByRole("link", { name: /Langston/ }) as HTMLAnchorElement
        expect(new URL(link.href).searchParams.get("query")).toBe("Langston's place")
        fireEvent.click(screen.getByRole("button", { name: /^Add to calendar, / }))
        const blob = (create.mock.calls[0] as unknown as [Blob])[0]
        expect(blob.type).toMatch(/^text\/calendar/)
    })

    it("before release the winners widget is the envelope teaser and leaderboard is absent", () => {
        renderHome()
        expect(screen.getByText("The envelope opens on Oscar night")).toBeTruthy()
        expect(screen.queryByRole("heading", { name: "Leaderboard" })).toBeNull()
    })
})

describe("Home rework", () => {
    it("members get no Committee section", () => {
        renderHome()
        expect(screen.queryByRole("group", { name: "Committee" })).toBeNull()
    })
    it("committee gets a separated Committee section holding only committee widgets", () => {
        profile.is_committee = true
        renderHome()
        const sec = screen.getByRole("group", { name: "Committee" })
        expect(within(sec).getByRole("region", { name: "Ballot health" })).toBeTruthy()
        expect(within(sec).getByRole("region", { name: "Needs your attention" })).toBeTruthy()
        expect(within(sec).queryByRole("region", { name: "Oscar night" })).toBeNull()
        expect(screen.getByRole("region", { name: "Oscar night" })).toBeTruthy()
    })
    it("no widget has buttons inside (cards are links), no Quick actions, no R pill, no tagline", () => {
        profile.is_committee = true
        const { container } = renderHome()
        expect(screen.queryByRole("region", { name: "Quick actions" })).toBeNull()
        expect(container.textContent).not.toMatch(/be there or be/i)
        for (const r of screen.getAllByRole("region")) {
            if (r.getAttribute("aria-label") === "Oscar night" || /Oscar night/.test(r.textContent ?? "")) continue
            expect(within(r).queryAllByRole("button")).toHaveLength(0)
        }
    })
    it("faces on Home carry pebble rings", () => {
        profile.is_committee = true
        hook.state = ready(data({ completion: { ballot: ballot(), members: [{ name: "Nick", voted: 0, total: 5, claimed: true }, { name: "TJ", voted: 5, total: 5, claimed: true }] } }))
        const { container } = renderHome()
        expect(container.querySelectorAll("[class*='ring-pebble-']").length).toBeGreaterThanOrEqual(2)
    })
    it("customize has drag handles and keeps keyboard Move up/down", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        expect(screen.getByRole("button", { name: "Reorder Countdown" })).toBeTruthy()
        expect(screen.getByRole("button", { name: "Move Countdown down" })).toBeTruthy()
        expect(screen.getByRole("switch", { name: "Ballot closes" }).getAttribute("aria-checked")).toBe("false")
    })
    it("customize: keyboard reorder on the handle (grab, arrow, drop), announced, persisted; Esc restores", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        const handle = screen.getByRole("button", { name: "Reorder Countdown" })
        expect(handle.getAttribute("aria-roledescription")).toBe("sortable")
        handle.focus()
        fireEvent.keyDown(handle, { key: " " })
        expect(screen.getByText(/picked up countdown/i)).toBeTruthy()
        fireEvent.keyDown(handle, { key: "ArrowDown" })
        expect(screen.getByText(/moved countdown to position 3 of/i)).toBeTruthy()
        let order = JSON.parse(mem.get("jsc.home.v1.u1")!).order as string[]
        expect(order.indexOf("countdown")).toBeGreaterThan(order.indexOf("pending"))
        fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Countdown" }), { key: " " })
        expect(screen.getByText(/dropped countdown at position 3/i)).toBeTruthy()
        // grab again, move, Escape puts it back
        const h2 = screen.getByRole("button", { name: "Reorder Countdown" })
        fireEvent.keyDown(h2, { key: "Enter" })
        fireEvent.keyDown(h2, { key: "ArrowUp" })
        fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Countdown" }), { key: "Escape" })
        order = JSON.parse(mem.get("jsc.home.v1.u1")!).order as string[]
        expect(order.indexOf("countdown")).toBeGreaterThan(order.indexOf("pending"))
        expect(screen.getByText(/cancelled\. countdown is back at position 3/i)).toBeTruthy()
    })
    it("customize: rows show a blurb, and release-gated rows say when they appear until released", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        expect(screen.getByText("Date, place, calendar")).toBeTruthy()
        expect(screen.getAllByText(/appears after results are released/i)).toHaveLength(2) // Leaderboard, Your stats
    })
    it("phones lay half-width widgets two-up; full-width widgets span both columns", () => {
        const { container } = renderHome()
        expect(container.querySelector("[class*='grid-cols-2']")).toBeTruthy()
        expect(container.querySelector("[class*='grid-cols-1']")).toBeNull()
        const wrap = (name: string) => screen.getByRole("region", { name }).parentElement!
        expect(wrap("Oscar night").className).toMatch(/\bcol-span-2\b/)
        expect(wrap("Countdown").className).not.toMatch(/col-span-2/)
        expect(wrap("Your progress").className).not.toMatch(/col-span-2/)
    })
    it("header has a ringed avatar linking to You, beside Customize", () => {
        const { container } = renderHome()
        const link = screen.getByRole("link", { name: "You" })
        expect(link.getAttribute("href")).toBe("/app/profile")
        expect(link.querySelector("[class*='ring-pebble-']")).toBeTruthy()
        expect(container).toBeTruthy()
        expect(screen.getByRole("button", { name: "Customize Home" })).toBeTruthy()
    })
    it("customize: the Move up/down twins are never keyboard tab stops", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        const twin = screen.getByRole("button", { name: "Move Countdown down" })
        expect(twin.tabIndex).toBe(-1)
        expect(twin.className).toMatch(/sr-only/)
        expect(twin.className).not.toMatch(/not-sr-only/)
    })
    it("new widgets render when turned on", () => {
        profile.is_committee = true
        mem.set("jsc.home.v1.u1", JSON.stringify({ version: 1, order: ["ballotCloses", "ballotHealth", "tiebreak", "revealReadiness"], hidden: [] }))
        hook.state = ready(data({ checks: [{ id: "winners", ok: true, label: "Winners decided" }] as never, completion: { ballot: ballot(), members: [{ name: "Nick", voted: 2, total: 5, claimed: true }] } }))
        renderHome()
        for (const n of ["Ballot closes", "Ballot health", "Tiebreak status", "Reveal readiness"]) expect(screen.getByRole("region", { name: n })).toBeTruthy()
        expect((within(screen.getByRole("region", { name: "Reveal readiness" })).getByRole("link", { name: "Reveal readiness" }) as HTMLAnchorElement).getAttribute("href")).toBe("/app/profile/release")
    })
})
