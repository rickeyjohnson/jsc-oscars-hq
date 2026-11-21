// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({ fetchPastStats: vi.fn(), fetchMembers: vi.fn(), fetchMemberDirectory: vi.fn() }))
vi.mock("../../api/pastStats", () => ({ fetchPastStats: api.fetchPastStats, PAST_STATS_UNAVAILABLE: "Previous stats aren't available yet" }))
vi.mock("../../api/members", () => ({ fetchMembers: api.fetchMembers, fetchMemberDirectory: api.fetchMemberDirectory }))

import PreviousOscarsPage, { PAST_FOOTNOTE } from "../../pages/PreviousOscarsPage"

const members = ["Anthony", "Demichael", "Rico", "Micah"].map((name) => ({ id: `m-${name}`, name, user_id: null }))
const row = (season_label: string, season_order: number, name: string, noms: number, wins: number) => ({ season_label, season_order, member_id: `m-${name}`, noms, wins })
const rows = [row("Fall 25", 4, "Anthony", 17, 3), row("Spring 24", 1, "Anthony", 9, 4), row("Fall 25", 4, "Demichael", 16, 4), row("Spring 24", 1, "Micah", 14, 4)]

const view = () => render(<MemoryRouter><PreviousOscarsPage /></MemoryRouter>)
beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.fetchMembers.mockResolvedValue(members)
    api.fetchMemberDirectory.mockResolvedValue([])
    api.fetchPastStats.mockResolvedValue({ available: true, rows })
})
afterEach(cleanup)

describe("Previous Oscars page", () => {
    it("chips are chronological after All time; All time lists everyone incl. a member with no rows", async () => {
        view()
        await screen.findByRole("group", { name: "Semester" })
        const chips = within(screen.getByRole("group", { name: "Semester" })).getAllByRole("button").map((b) => b.textContent)
        expect(chips).toEqual(["All time", "Spring 24", "Fall 25"])
        expect(screen.getByText("Rico")).toBeTruthy()
        expect(screen.getByText("0%")).toBeTruthy()
        expect(screen.getByText(PAST_FOOTNOTE)).toBeTruthy()
    })
    it("a semester shows only members with a row there", async () => {
        view()
        fireEvent.click(await screen.findByRole("button", { name: "Fall 25" }))
        expect(screen.queryByText("Rico")).toBeNull()
        expect(screen.queryByText("Micah")).toBeNull()
        expect(screen.getAllByText("Demichael").length).toBeGreaterThan(0)
    })
    it("table missing: friendly message, no footnote", async () => {
        api.fetchPastStats.mockResolvedValue({ available: false })
        view()
        expect(await screen.findByText("Previous stats aren't available yet")).toBeTruthy()
        expect(screen.queryByText(PAST_FOOTNOTE)).toBeNull()
    })
    it("error shows retry", async () => {
        api.fetchPastStats.mockRejectedValueOnce(new Error("x"))
        view()
        fireEvent.click(await screen.findByRole("button", { name: /try again/i }))
        await waitFor(() => expect(screen.getByRole("group", { name: "Semester" })).toBeTruthy())
    })
    it("empty table", async () => {
        api.fetchPastStats.mockResolvedValue({ available: true, rows: [] })
        view()
        expect(await screen.findByText("No previous stats yet")).toBeTruthy()
    })
})
