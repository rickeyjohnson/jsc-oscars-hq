// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { MemoryRouter } from "react-router-dom"
import { STAT_MEMBERS, STAT_ROWS } from "../../test/statsFixture"

const api = vi.hoisted(() => ({ fetchPastStats: vi.fn(), fetchMembers: vi.fn(), fetchMemberDirectory: vi.fn(), fetchCurrentSeason: vi.fn(), fetchSeasonResults: vi.fn() }))
vi.mock("../../api/pastStats", () => ({ fetchPastStats: api.fetchPastStats, PAST_STATS_UNAVAILABLE: "Previous stats aren't available yet" }))
vi.mock("../../api/members", () => ({ fetchMembers: api.fetchMembers, fetchMemberDirectory: api.fetchMemberDirectory }))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: api.fetchCurrentSeason, fetchInspiredCategories: () => Promise.resolve([]) }))
vi.mock("../../api/results", () => ({ fetchSeasonResults: api.fetchSeasonResults }))
let who = "m-Rickey"
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { is_committee: false }, member: { id: who, name: who.slice(2) }, loading: false }) }))

import { MyStats } from "../../pages/stats/MyStats"

const season = (released: string | null) => ({ id: "S", name: "Fall 2026", ceremony_at: null, location: null, results_released_at: released })
const view = () => render(<MemoryRouter><MyStats /></MemoryRouter>)
const tile = (label: string) => screen.getByRole("group", { name: label })

beforeEach(() => {
    who = "m-Rickey"
    Object.values(api).forEach((f) => f.mockReset())
    api.fetchMembers.mockResolvedValue(STAT_MEMBERS)
    api.fetchMemberDirectory.mockResolvedValue([])
    api.fetchPastStats.mockResolvedValue({ available: true, rows: STAT_ROWS })
    api.fetchCurrentSeason.mockResolvedValue(season(null))
})
afterEach(cleanup)

describe("My stats (You tab)", () => {
    it("tiles are all-time totals with a rank; noms and win rate carry the slide-count tilde and a footnote", async () => {
        view()
        await screen.findByText("Noms vs wins, by semester")
        expect(within(tile("Wins")).getByText("24")).toBeTruthy()
        expect(within(tile("Noms")).getByText("~79")).toBeTruthy()
        expect(within(tile("Win rate")).getByText("~30.4%")).toBeTruthy()
        for (const l of ["Wins", "Noms", "Win rate"]) expect(within(tile(l)).getByText(/#\d+ of \d+/)).toBeTruthy()
        expect(screen.getByText(/~ = counted from slides/)).toBeTruthy()
        expect(screen.getAllByText(/in 6 of 6 semesters/).length).toBeGreaterThan(0)
    })
    it("shows every chart as an image with a summary and the how-it-works sheet", async () => {
        view()
        await screen.findByText("Win rate trend")
        const imgs = screen.getAllByRole("img").map((i) => i.getAttribute("aria-label") ?? "")
        expect(imgs.some((l) => l.startsWith("Rickey: nominations and wins"))).toBe(true)
        expect(imgs.some((l) => l.startsWith("Rickey: win rate in each semester"))).toBe(true)
        expect(imgs.some((l) => l.startsWith("Rickey: actual wins against expected"))).toBe(true)
        expect(screen.getByText("Expected vs actual wins")).toBeTruthy()
        expect(screen.getByText("Where you stand")).toBeTruthy()
        expect(screen.getAllByText(/^Top \d+%/).length).toBeGreaterThan(0)
        expect(screen.queryByText("Highlights")).toBeNull()
        expect(screen.queryByText(/semester crown|Best semester/)).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: "How these are calculated" }))
        const dlg = await screen.findByRole("dialog", { name: "How these are calculated" })
        expect(within(dlg).getAllByRole("button", { name: "Close" })).toHaveLength(1)
        expect(within(dlg).getByText(/Expected wins/)).toBeTruthy()
    })
    it("every stat card shares one layout: stretch, same min-height, clamped header", async () => {
        const { container } = view()
        await screen.findByText("Win rate trend")
        const grid = container.querySelector("[data-stat-card]")!.parentElement!.closest(".grid")!
        expect(grid.className).toContain("items-stretch")
        const cards = [...container.querySelectorAll("[data-stat-card]")]
        expect(cards.length).toBe(4)
        for (const c of cards) {
            expect(c.className).toContain("h-full")
            expect(c.querySelector("h3")!.className).toContain("line-clamp-1")
            expect(c.children[1].className).toContain("min-h-[3.75rem]")
            expect(c.children[2].className).toContain("min-h-64")
        }
    })
    it("before release the live season is completely hidden: not requested, locked note, totals unchanged", async () => {
        view()
        await screen.findByText(/Fall 2026 is locked/)
        expect(api.fetchSeasonResults).not.toHaveBeenCalled()
        expect(within(tile("Wins")).getByText("24")).toBeTruthy()
        expect(screen.queryAllByText(/in 7 of 7/)).toHaveLength(0)
    })
    it("at release the live season counts at once as the last column", async () => {
        api.fetchCurrentSeason.mockResolvedValue(season("2026-11-20T00:00:00Z"))
        api.fetchSeasonResults.mockResolvedValue({
            categories: [{ id: "c1", name: "X", nominees: [{ id: "n1", display_name: "Rickey", member_ids: ["m-Rickey"] }, { id: "n2", display_name: "Rico", member_ids: ["m-Rico"] }] }],
            results: { c1: { category_id: "c1", winner_nominee_id: "n1", nominee_ids: ["n1", "n2"] } },
        })
        view()
        await waitFor(() => expect(screen.getAllByText(/in 7 of 7 semesters/).length).toBeGreaterThan(0))
        expect(within(tile("Wins")).getByText("25")).toBeTruthy()
        expect(screen.queryByText(/Fall 2026 is locked/)).toBeNull()
    })
    it("a member with a gap shows dashes, not zeros, and a one-semester trend message when needed", async () => {
        who = "m-Demichael"
        view()
        await screen.findByText("Noms vs wins, by semester")
        expect(screen.getAllByText(/in 2 of 6 semesters/).length).toBeGreaterThan(0)
        const bars = screen.getAllByRole("img").find((i) => i.getAttribute("aria-label")?.startsWith("Demichael: nominations"))!
        expect(bars.getAttribute("aria-label")).toMatch(/Fall 23 not in/)
        expect(bars.querySelectorAll("text").length).toBeGreaterThan(0)
    })
    it("Rico has no rows: not enough data yet, no charts", async () => {
        who = "m-Rico"
        view()
        expect(await screen.findByText("Not enough data yet")).toBeTruthy()
        expect(screen.queryByText("Win rate trend")).toBeNull()
        expect(screen.queryByRole("img", { name: /nominations and wins/ })).toBeNull()
    })
    it("loading shows a skeleton, an error shows Try again and recovers", async () => {
        api.fetchPastStats.mockRejectedValueOnce(new Error("x"))
        view()
        expect(screen.getByRole("status", { name: "Loading stats" })).toBeTruthy()
        expect(await screen.findByText("Couldn't load stats")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        await waitFor(() => expect(screen.getByText("Noms vs wins, by semester")).toBeTruthy())
    })
    it("table not deployed: friendly message; empty table: empty state", async () => {
        api.fetchPastStats.mockResolvedValueOnce({ available: false })
        view()
        expect(await screen.findByText("Previous stats aren't available yet")).toBeTruthy()
        cleanup()
        api.fetchPastStats.mockResolvedValue({ available: true, rows: [] })
        view()
        expect(await screen.findByText("No stats yet")).toBeTruthy()
    })
})

describe("ProfilePage source", () => {
    const src = readFileSync(join(__dirname, "../../pages/ProfilePage.tsx"), "utf8")
    it("has My stats, no Previous Oscars row, keeps Edit profile, Settings and Log out", () => {
        expect(src).toContain("<MyStats />")
        expect(src).not.toMatch(/Previous Oscars|results\/previous/)
        expect(src).toContain("Edit profile")
        expect(src).toContain('to="/app/profile/settings"')
        expect(src).toContain("Log out")
        expect(src.indexOf("<MyStats />")).toBeLessThan(src.indexOf('header="Account"'))
    })
})
