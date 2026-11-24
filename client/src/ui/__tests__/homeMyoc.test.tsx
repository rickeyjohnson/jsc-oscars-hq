// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { HomeState } from "../../pages/home/useHomeData"
import type { HomeData } from "../logic/homeData"
import type { MyocIdea, MyocWindow } from "../../lib/myoc"

const hook = vi.hoisted(() => ({ state: null as unknown }))
vi.mock("../../pages/home/useHomeData", () => ({ useHomeData: () => hook.state }))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { is_committee: false, display_name: "Rico", image_url: "x" }, member: { id: "m1", name: "Rico", user_id: "u1" }, loading: false }) }))
vi.mock("../../supabaseClient", () => ({ supabase: {} }))
vi.mock("../../api/myoc", () => ({ fetchMyocWindows: vi.fn(), fetchIdeas: vi.fn() }))

import { fetchIdeas, fetchMyocWindows } from "../../api/myoc"
import HomePage from "../../pages/HomePage"
import { myocHomeView } from "../../lib/myoc"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const win = (opens: number, closes: number): MyocWindow => ({ id: "w1", season_id: "S", opens_at: new Date(Date.now() + opens).toISOString(), closes_at: new Date(Date.now() + closes).toISOString() })
const idea = (o: Partial<MyocIdea>): MyocIdea => ({ id: "i", window_id: "w1", author_id: "u1", name: "n", description: "", hint: null, status: "submitted", merged_into: null, assigned_category: null, created_at: "", updated_at: "", ...o })
const data: HomeData = { season: { id: "S", name: "Fall", ceremony_at: null, location: null, results_released_at: null } as never, released: false, summaries: [], results: null, ballots: null, checks: null, completion: null, errors: {} }
const state: HomeState = { data, loading: false, error: null, reload: vi.fn(), directory: null }

beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k.includes("firstRunGuide") ? "1" : null), setItem: vi.fn(), removeItem: vi.fn() })
    hook.state = state
    vi.mocked(fetchMyocWindows).mockReset()
    vi.mocked(fetchIdeas).mockReset().mockResolvedValue([])
})
afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

const renderHome = () => render(<MemoryRouter><HomePage /></MemoryRouter>)

describe("Home Make Your Own Categories widget", () => {
    it("open window: title, 'Open · closes ...', own non-withdrawn idea count, whole card links to MYOC", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([win(-DAY, 2 * DAY + HOUR)])
        vi.mocked(fetchIdeas).mockResolvedValue([idea({ id: "a" }), idea({ id: "b", status: "accepted" }), idea({ id: "c", status: "withdrawn" }), idea({ id: "d", author_id: "someone-else" })])
        renderHome()
        const card = await screen.findByRole("region", { name: "Make Your Own Categories" })
        expect(card.textContent).toMatch(/Open · closes in 2d/)
        expect(card.textContent).toContain("2 ideas sent")
        expect(card.querySelector("button")).toBeNull()
        const link = screen.getByRole("link", { name: "Make Your Own Categories" })
        expect(link.getAttribute("href")).toBe("/app/profile/settings/myoc")
        expect(card.contains(link)).toBe(true)
        expect(fetchIdeas).toHaveBeenCalledWith("w1")
    })

    it("scheduled window: 'Opens <date>' and no idea fetch", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([win(3 * DAY, 6 * DAY)])
        renderHome()
        const card = await screen.findByRole("region", { name: "Make Your Own Categories" })
        expect(card.textContent).toMatch(/Opens \w{3}, \w{3} \d+/)
        expect(card.textContent).not.toMatch(/ideas? sent/)
        expect(fetchIdeas).not.toHaveBeenCalled()
    })

    it.each([
        ["no windows", [] as MyocWindow[]],
        ["only a closed window", [win(-5 * DAY, -DAY)]],
    ])("hidden with %s: no card, no empty cell", async (_n, windows) => {
        vi.mocked(fetchMyocWindows).mockResolvedValue(windows)
        renderHome()
        await waitFor(() => expect(fetchMyocWindows).toHaveBeenCalled())
        expect(screen.queryByRole("region", { name: "Make Your Own Categories" })).toBeNull()
        expect(screen.queryByRole("heading", { name: "Make Your Own Categories" })).toBeNull()
    })

    it("hidden when MYOC fails to load (tables not set up) or before the season is known", async () => {
        vi.mocked(fetchMyocWindows).mockRejectedValue({ code: "PGRST205" })
        renderHome()
        await waitFor(() => expect(fetchMyocWindows).toHaveBeenCalled())
        await waitFor(() => expect(screen.queryByRole("region", { name: "Make Your Own Categories" })).toBeNull())
        cleanup()
        vi.mocked(fetchMyocWindows).mockClear()
        hook.state = { ...state, data: null, loading: true }
        renderHome()
        expect(fetchMyocWindows).not.toHaveBeenCalled()
        // not known yet: the cell is held as a skeleton (no pop-in), never as a real card
        expect(screen.getByRole("status", { name: /loading make your own categories/i })).toBeTruthy()
        expect(screen.queryByText(/ideas? sent/i)).toBeNull()
    })
})

describe("myocHomeView", () => {
    const now = new Date("2026-11-22T12:00:00Z")
    const w = (o: string, c: string): MyocWindow => ({ id: "w", season_id: "S", opens_at: o, closes_at: c })
    it("maps phases", () => {
        expect(myocHomeView(null, 0, now)).toBeNull()
        expect(myocHomeView(w("2026-11-20T00:00:00Z", "2026-11-25T00:00:00Z"), 3, now)).toMatchObject({ kind: "open", sent: 3 })
        expect(myocHomeView(w("2026-11-24T00:00:00Z", "2026-11-26T00:00:00Z"), 0, now)).toMatchObject({ kind: "upcoming" })
        expect(myocHomeView(w("2026-11-10T00:00:00Z", "2026-11-12T00:00:00Z"), 0, now)).toBeNull()
    })
})
