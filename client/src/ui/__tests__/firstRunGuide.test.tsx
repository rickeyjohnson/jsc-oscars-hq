// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { FirstRunGuide } from "../../pages/FirstRunGuide"
import { firstRunKey, hasSeenGuide, markGuideSeen } from "../logic/firstRun"
import type { HomeState } from "../../pages/home/useHomeData"

const hook = vi.hoisted(() => ({ state: null as unknown }))
vi.mock("../../pages/home/useHomeData", () => ({ useHomeData: () => hook.state }))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" }, session: { user: { id: "u1" } } }) }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { display_name: "Rico", image_url: "x", user_id: "u1", is_committee: false }, member: { id: "m1", name: "Rico", user_id: "u1" }, loading: false }) }))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn(async () => ({ id: "S", name: "Fall", ceremony_at: "2026-12-04T15:00:00Z", location: "The Lodge", results_released_at: null })) }))
vi.mock("../../supabaseClient", () => ({ supabase: {} }))

import HomePage from "../../pages/HomePage"
import SettingsPage from "../../pages/SettingsPage"

const season = { id: "S", name: "Fall", ceremony_at: "2026-12-04T15:00:00Z", location: "The Lodge", results_released_at: null }
const mem = new Map<string, string>()

beforeEach(() => {
    mem.clear()
    vi.stubGlobal("localStorage", { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) })
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    hook.state = { data: { season, released: false, summaries: [], results: null, ballots: null, checks: null, completion: null, errors: {} }, loading: false, error: null, reload: vi.fn(), directory: null } satisfies HomeState
})
afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe("first-run guide storage", () => {
    it("remembers per user and survives a throwing storage", () => {
        const s = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }
        expect(hasSeenGuide(s, "u1")).toBe(false)
        markGuideSeen(s, "u1")
        expect(mem.get(firstRunKey("u1"))).toBe("1")
        expect(hasSeenGuide(s, "u1")).toBe(true)
        expect(hasSeenGuide(s, "u2")).toBe(false)
        const bad = { getItem: () => { throw new Error("no") }, setItem: () => { throw new Error("no") } }
        expect(hasSeenGuide(bad, "u1")).toBe(false)
        expect(() => markGuideSeen(bad, "u1")).not.toThrow()
    })
})

describe("FirstRunGuide", () => {
    it("steps through three cards with Next/Back and ends on Got it", () => {
        const done = vi.fn()
        render(<FirstRunGuide open onClose={done} season={season} />)
        const dialog = screen.getByRole("dialog", { name: "How it works" })
        expect(screen.getByText(/The Lodge/)).toBeTruthy()
        expect(screen.getByRole("status").textContent).toBe("Step 1 of 3")
        expect(screen.queryByRole("button", { name: "Back" })).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: "Next" }))
        expect(screen.getByRole("status").textContent).toBe("Step 2 of 3")
        expect(screen.getByText(/can't vote for yourself/)).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Back" }))
        expect(screen.getByRole("status").textContent).toBe("Step 1 of 3")
        fireEvent.keyDown(dialog, { key: "ArrowRight" })
        fireEvent.keyDown(dialog, { key: "ArrowRight" })
        expect(screen.getByRole("status").textContent).toBe("Step 3 of 3")
        expect(screen.getAllByTestId("guide-dot")).toHaveLength(3)
        fireEvent.click(screen.getByRole("button", { name: "Got it" }))
        expect(done).toHaveBeenCalledTimes(1)
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1)
    })
    it("Skip closes, and the date falls back when it isn't set", () => {
        const done = vi.fn()
        render(<FirstRunGuide open onClose={done} season={null} />)
        expect(screen.getByText(/coming soon/)).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Skip" }))
        expect(done).toHaveBeenCalled()
    })
    it("only the current card is exposed to assistive tech", () => {
        render(<FirstRunGuide open onClose={() => {}} season={season} />)
        const slides = document.querySelectorAll('[aria-roledescription="slide"]')
        expect([...slides].map((s) => s.hasAttribute("inert"))).toEqual([false, true, true])
    })
})

describe("guide on Home and Settings", () => {
    it("shows once on first Home, dismiss persists, and does not return", () => {
        const { unmount } = render(<MemoryRouter><HomePage /></MemoryRouter>)
        expect(screen.getByRole("dialog", { name: "How it works" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Close" }))
        expect(mem.get(firstRunKey("u1"))).toBe("1")
        unmount()
        cleanup()
        render(<MemoryRouter><HomePage /></MemoryRouter>)
        expect(screen.queryByRole("dialog", { name: "How it works" })).toBeNull()
    })
    it("reopens from the How it works row in Settings", async () => {
        mem.set(firstRunKey("u1"), "1")
        render(<MemoryRouter><SettingsPage /></MemoryRouter>)
        expect(screen.queryByRole("dialog", { name: "How it works" })).toBeNull()
        fireEvent.click(screen.getByText("Welcome guide"))
        expect(await screen.findByRole("dialog", { name: "How it works" })).toBeTruthy()
    })
})
