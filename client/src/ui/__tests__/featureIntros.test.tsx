// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { IntroHost, IntroProvider } from "../IntroHost"
import { useIntroGate } from "../introContext"
import { INTROS, hasSeenIntro, introKey, introsFor, markIntroSeen, resetIntros } from "../logic/featureIntros"
import { firstRunKey, markGuideSeen } from "../logic/firstRun"

const user = vi.hoisted(() => ({ committee: false }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { user_id: "u1", is_committee: user.committee }, member: { id: "m1" } }) }))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" }, session: { user: { id: "u1" } } }) }))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn(async () => null) }))
vi.mock("../../supabaseClient", () => ({ supabase: {} }))

import SettingsPage from "../../pages/SettingsPage"

const mem = new Map<string, string>()
const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) }

function Gate({ topic }: { topic: string | null }) {
    useIntroGate(topic)
    return null
}
const host = (path: string, gate: string | null = null) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <IntroProvider>
                <Gate topic={gate} />
                <IntroHost />
            </IntroProvider>
        </MemoryRouter>,
    )
const settle = () => act(() => void vi.advanceTimersByTime(700))
const dialog = () => screen.queryByRole("dialog")

beforeEach(() => {
    vi.useFakeTimers()
    mem.clear()
    user.committee = false
    mem.set(firstRunKey("u1"), "1")
    vi.stubGlobal("localStorage", store)
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
})
afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe("registry", () => {
    it("every intro has 1-4 short cards and committee ones are gated by role", () => {
        for (const i of INTROS) {
            expect(i.cards.length).toBeGreaterThanOrEqual(1)
            expect(i.cards.length).toBeLessThanOrEqual(4)
        }
        const member = introsFor(false).map((i) => i.id)
        expect(member).toContain("voting")
        expect(member).not.toContain("reveal")
        expect(introsFor(true).map((i) => i.id)).toEqual(expect.arrayContaining(["reveal", "builder", "manage-ballots", "rounds", "myoc-review", "ceremony"]))
    })
    it("flags are per user and per feature, and reset clears them", () => {
        markIntroSeen(store, "u1", "ballots")
        expect(hasSeenIntro(store, "u1", "ballots")).toBe(true)
        expect(hasSeenIntro(store, "u2", "ballots")).toBe(false)
        expect(hasSeenIntro(store, "u1", "results")).toBe(false)
        resetIntros(store, "u1")
        expect(mem.has(introKey("u1", "ballots"))).toBe(false)
    })
})

describe("IntroHost", () => {
    it("shows the screen's intro once, on the first visit, after it settles", () => {
        const { unmount } = host("/app/ballots")
        expect(dialog()).toBeNull()
        settle()
        expect(screen.getByRole("dialog", { name: "Ballots" })).toBeTruthy()
        expect(mem.get(introKey("u1", "ballots"))).toBe("1")
        unmount()
        host("/app/ballots")
        settle()
        expect(dialog()).toBeNull()
    })
    it("never shows before the welcome guide has been seen, then starts when it is", () => {
        mem.delete(firstRunKey("u1"))
        host("/app/ballots")
        settle()
        expect(dialog()).toBeNull()
        act(() => markGuideSeen(store, "u1"))
        settle()
        expect(screen.getByRole("dialog", { name: "Ballots" })).toBeTruthy()
    })
    it("committee intros never show to members, and show to the committee", () => {
        host("/app/profile/ballots")
        settle()
        expect(dialog()).toBeNull()
        cleanup()
        user.committee = true
        host("/app/profile/ballots")
        settle()
        expect(screen.getByRole("dialog", { name: "Manage ballots" })).toBeTruthy()
    })
    it("waits for the page gate: no vote intro until the ballot is ready", () => {
        const { unmount } = host("/app/ballots/b1", null)
        settle()
        expect(dialog()).toBeNull()
        unmount()
        host("/app/ballots/b1", "vote")
        settle()
        expect(screen.getByRole("dialog", { name: "Voting" })).toBeTruthy()
    })
    it("Results intro is for Winners; the Leaderboard has its own, only once the leaderboard is showing", () => {
        const { unmount } = host("/app/results")
        settle()
        expect(screen.getByRole("dialog", { name: "Results" })).toBeTruthy()
        expect(screen.getByText(/Tap Leaderboard to see everyone's stats/)).toBeTruthy()
        unmount()
        cleanup()
        mem.clear()
        mem.set(firstRunKey("u1"), "1")
        const lb = host("/app/results?view=leaderboard", null)
        settle()
        expect(dialog()).toBeNull() // Results intro never shows on the leaderboard, and the leaderboard one waits for its page
        lb.unmount()
        host("/app/results?view=leaderboard", "leaderboard")
        settle()
        expect(screen.getByRole("dialog", { name: "Leaderboard" })).toBeTruthy()
    })
    it("You intro talks about My stats and the Leaderboard; Previous Oscars is gone", () => {
        const you = INTROS.find((i) => i.id === "you")!
        expect(JSON.stringify(you.cards)).toMatch(/My stats/)
        expect(JSON.stringify(you.cards)).not.toMatch(/Previous Oscars/)
        expect(INTROS.map((i) => i.id)).not.toContain("previous")
        expect(INTROS.map((i) => i.title)).not.toContain("Previous Oscars")
    })
    it("queues: one sheet at a time, the next one after the first closes", () => {
        user.committee = true
        host("/app/profile")
        settle()
        expect(screen.getAllByRole("dialog")).toHaveLength(1)
        expect(screen.getByRole("dialog", { name: "You and Settings" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Close" }))
        act(() => void vi.advanceTimersByTime(1500))
        expect(screen.getByRole("dialog", { name: "Ceremony date" })).toBeTruthy()
    })
    it("steps with keys and has one Close and a Got it final card", () => {
        host("/app/ballots")
        settle()
        expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1)
        fireEvent.keyDown(document, { key: "ArrowRight" })
        expect(screen.getByRole("status").textContent).toBe("Step 2 of 2")
        expect(screen.getByRole("button", { name: "Got it" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Got it" }))
    })
})

describe("Settings > How it works", () => {
    const renderSettings = () => render(<MemoryRouter><IntroProvider><SettingsPage /></IntroProvider></MemoryRouter>)
    it("lists only the intros the role can see and reopens one", () => {
        renderSettings()
        expect(screen.getByText("Welcome guide")).toBeTruthy()
        expect(screen.getByText("Voting")).toBeTruthy()
        expect(screen.getByText("Leaderboard")).toBeTruthy()
        expect(screen.queryByText("Previous Oscars")).toBeNull()
        expect(screen.queryByText("The envelope")).toBeNull()
        fireEvent.click(screen.getByText("Voting"))
        expect(screen.getByRole("dialog", { name: "Voting" })).toBeTruthy()
    })
    it("committee also sees committee intros", () => {
        user.committee = true
        renderSettings()
        expect(screen.getByText("The envelope")).toBeTruthy()
    })
    it("Show all tips again clears the flags", () => {
        mem.set(introKey("u1", "voting"), "1")
        renderSettings()
        fireEvent.click(screen.getByText("Show all tips again"))
        expect(mem.has(introKey("u1", "voting"))).toBe(false)
        expect(mem.has(firstRunKey("u1"))).toBe(false)
    })
})
