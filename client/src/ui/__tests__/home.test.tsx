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
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { ...profile, display_name: "Rico Johnson" }, member: { id: "m1", name: "Rico", user_id: "u1" }, loading: false }) }))
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
        mem.set("jsc.home.v1.u1", JSON.stringify({ version: 1, order: ["notVoted", "attention", "quickActions", "ceremony", "countdown", "pending", "progress", "latestWinners", "leaderboardPeek"], hidden: [] }))
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
        expect(within(nv).getByText("Nick")).toBeTruthy()
    })

    it("shows the pending ballot with a Continue link and N left", () => {
        renderHome()
        const r = screen.getByRole("region", { name: "Your ballots" })
        expect(within(r).getByText("3 left")).toBeTruthy()
        expect((within(r).getByRole("link", { name: /continue main ballot/i }) as HTMLAnchorElement).getAttribute("href")).toBe("/app/ballots/b1")
    })

    it("pending empty state links to Ballots", () => {
        hook.state = ready(data({ summaries: [ballot({ my_vote_count: 5 })] }))
        renderHome()
        expect(screen.getByText("You're all caught up.")).toBeTruthy()
        expect((screen.getByRole("link", { name: /see your ballots/i }) as HTMLAnchorElement).getAttribute("href")).toBe("/app/ballots")
    })

    it("customize: hiding Countdown removes it and persists; Move up reorders; reset restores", () => {
        renderHome()
        fireEvent.click(screen.getByRole("button", { name: "Customize Home" }))
        const sw = screen.getByRole("switch", { name: "Countdown" })
        expect(sw.getAttribute("aria-checked")).toBe("true")
        fireEvent.click(sw)
        expect(screen.getByRole("switch", { name: "Countdown" }).getAttribute("aria-checked")).toBe("false")
        expect(JSON.parse(mem.get("jsc.home.v1.u1")!).hidden).toContain("countdown")
        fireEvent.click(screen.getByRole("button", { name: "Done" }))
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
        expect(screen.getByRole("switch", { name: "Quick actions" })).toBeTruthy()
    })

    it("a failing widget fetch shows its own error with retry and leaves the others", () => {
        profile.is_committee = true
        const reload = vi.fn()
        hook.state = ready(data({ errors: { completion: new Error("x") } }), { reload })
        renderHome()
        const nv = screen.getByRole("region", { name: "Who hasn't voted" })
        fireEvent.click(within(nv).getByRole("button", { name: /try again/i }))
        expect(reload).toHaveBeenCalled()
        expect(screen.getByRole("region", { name: "Your ballots" }).textContent).toMatch(/3 left/)
        expect(screen.getByRole("region", { name: "Oscar night" }).textContent).toMatch(/Add to calendar/)
    })

    it("shows loading skeletons per widget", () => {
        hook.state = { data: null, loading: true, error: null, reload: vi.fn(), directory: null }
        renderHome()
        expect(screen.getAllByRole("status")).toHaveLength(5)
        expect(screen.getByRole("status", { name: /loading countdown/i })).toBeTruthy()
    })

    it("null ceremony date disables Add to calendar with an explanation; null location hides directions", () => {
        hook.state = ready(data({ season: { id: "S", name: "Fall", ceremony_at: null, location: null, results_released_at: null } }))
        renderHome()
        const btn = screen.getByRole("button", { name: "Add to calendar" }) as HTMLButtonElement
        expect(btn.disabled).toBe(true)
        expect(screen.getByText(/date isn't set yet/i)).toBeTruthy()
        expect(screen.queryByRole("link", { name: "Directions" })).toBeNull()
        expect(screen.queryByText(/📍/)).toBeNull()
    })

    it("Directions encodes the location; Add to calendar downloads an .ics Blob", () => {
        const create = vi.fn(() => "blob:x")
        URL.createObjectURL = create
        URL.revokeObjectURL = vi.fn()
        renderHome()
        const link = screen.getByRole("link", { name: "Directions" }) as HTMLAnchorElement
        expect(new URL(link.href).searchParams.get("query")).toBe("Langston's place")
        fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }))
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
        expect(within(sec).getByRole("region", { name: "Quick actions" })).toBeTruthy()
        expect(within(sec).getByRole("region", { name: "Needs your attention" })).toBeTruthy()
        expect(within(sec).queryByRole("region", { name: "Oscar night" })).toBeNull()
        expect(screen.getByRole("region", { name: "Oscar night" })).toBeTruthy()
    })
    it("faces on Home carry pebble rings", () => {
        profile.is_committee = true
        hook.state = ready(data({ completion: { ballot: ballot(), members: [{ name: "Nick", voted: 0, total: 5, claimed: true }] } }))
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
    it("new widgets render when turned on", () => {
        profile.is_committee = true
        mem.set("jsc.home.v1.u1", JSON.stringify({ version: 1, order: ["ballotCloses", "ballotHealth", "tiebreak", "revealReadiness"], hidden: [] }))
        hook.state = ready(data({ checks: [{ id: "winners", ok: true, label: "Winners decided" }] as never, completion: { ballot: ballot(), members: [{ name: "Nick", voted: 2, total: 5, claimed: true }] } }))
        renderHome()
        for (const n of ["Ballot closes", "Ballot health", "Tiebreak status", "Reveal readiness"]) expect(screen.getByRole("region", { name: n })).toBeTruthy()
        expect((within(screen.getByRole("region", { name: "Reveal readiness" })).getByRole("link") as HTMLAnchorElement).getAttribute("href")).toBe("/app/profile/release")
    })
})
