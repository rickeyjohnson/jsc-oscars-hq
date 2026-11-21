// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import VotePage from "./VotePage"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { castVote, fetchMyVotes } from "../api/votes"
import { ballot, category, nominee } from "../test/fixtures"

const userState = vi.hoisted(() => ({ value: { member: { id: "m-me", name: "Me", user_id: "u-me" } as unknown, loading: false } }))
vi.mock("../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn(), addNominee: vi.fn() }))
vi.mock("../api/ballots", () => ({ fetchBallotDetail: vi.fn() }))
vi.mock("../api/members", () => ({ fetchMembers: vi.fn(), fetchMemberAvatars: vi.fn().mockResolvedValue({}) }))
vi.mock("../context/UserContenxt", () => ({ useUserData: () => userState.value }))

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/app/ballots/B1"]}>
            <Routes><Route path="/app/ballots/:ballotId" element={<VotePage />} /></Routes>
        </MemoryRouter>,
    )

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(fetchMembers).mockResolvedValue([])
    Element.prototype.scrollIntoView = vi.fn()
})

describe("VotePage load (P1-1)", () => {
    it("shows a skeleton while loading", () => {
        vi.mocked(fetchBallotDetail).mockReturnValue(new Promise(() => {}))
        vi.mocked(fetchMyVotes).mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.getByRole("status", { name: "Loading ballot" })).toBeTruthy()
    })
    it("a failed load shows Try again, and retrying loads the ballot", async () => {
        vi.mocked(fetchBallotDetail).mockRejectedValueOnce(new Error("boom")).mockResolvedValue(ballot({ categories: [category("c1", "Best Picture", [nominee("n1", "Ann")])] }))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("boom")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByRole("region", { name: /best picture/i })).toBeTruthy()
    })
    it("a failed members fetch (group categories only) still opens the ballot", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ categories: [category("c1", "Best Duo", [nominee("n1", "Ann")], { nominee_mode: "group" })] }))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        vi.mocked(fetchMembers).mockRejectedValue(new Error("members down"))
        renderPage()
        expect(await screen.findByRole("region", { name: /best duo/i })).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    })
})

describe("expired session while voting (P1-5)", () => {
    it("says you were signed out and offers Log in, not a retry that cannot work", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ categories: [category("c1", "Best Picture", [nominee("n1", "Ann"), nominee("n2", "Bo")])] }))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        vi.mocked(castVote).mockRejectedValue({ code: "PGRST301", message: "JWT expired" })
        renderPage()
        fireEvent.click(await screen.findByRole("radio", { name: /ann$/i }))
        expect((await screen.findByRole("alert")).textContent).toContain("You were signed out")
        expect(screen.getByRole("button", { name: "Log in" })).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    })
})

describe("a signed-in account with no member (P1-8)", () => {
    it("offers a Claim your name button", () => {
        userState.value = { member: null, loading: false }
        renderPage()
        expect(screen.getByRole("link", { name: "Claim your name to vote" }).getAttribute("href")).toBe("/claim")
        userState.value = { member: { id: "m-me", name: "Me", user_id: "u-me" }, loading: false }
    })
})
