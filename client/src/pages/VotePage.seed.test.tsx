// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import VotePage from "./VotePage"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { castVote, fetchMyVotes } from "../api/votes"
import { cacheClearAll, setStorage } from "../lib/cache/store"
import { storeBallotDetail } from "../lib/cache/detail"
import { ballot, category, deferred, nominee } from "../test/fixtures"

vi.mock("../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn(), addNominee: vi.fn() }))
vi.mock("../api/ballots", () => ({ fetchBallotDetail: vi.fn() }))
vi.mock("../api/members", () => ({ fetchMembers: vi.fn(), fetchMemberAvatars: vi.fn().mockResolvedValue({}) }))
vi.mock("../context/UserContenxt", () => ({ useUserData: () => ({ member: { id: "m-me", name: "Me", user_id: "u-me" }, loading: false }) }))

const cats = () => [category("c1", "Best Picture", [nominee("n-ann", "Ann"), nominee("n-bo", "Bo")])]
const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/app/ballots/B1"]}>
            <Routes><Route path="/app/ballots/:ballotId" element={<VotePage />} /></Routes>
        </MemoryRouter>,
    )

beforeEach(() => {
    vi.resetAllMocks()
    setStorage(null)
    cacheClearAll()
    vi.mocked(fetchMembers).mockResolvedValue([])
    vi.mocked(castVote).mockResolvedValue(undefined)
    Element.prototype.scrollIntoView = vi.fn()
})

describe("VotePage cached first paint (T9)", () => {
    it("paints the cached ballot at once but takes no vote until the server answers", async () => {
        storeBallotDetail("u-me", ballot({ categories: cats() }))
        const d = deferred<ReturnType<typeof ballot>>()
        const v = deferred<Record<string, string>>()
        vi.mocked(fetchBallotDetail).mockReturnValue(d.promise)
        vi.mocked(fetchMyVotes).mockReturnValue(v.promise)
        renderPage()
        fireEvent.click(await screen.findByRole("radio", { name: /ann$/i }))
        expect(castVote).not.toHaveBeenCalled()
        d.resolve(ballot({ categories: cats() }))
        v.resolve({})
        await waitFor(() => {
            fireEvent.click(screen.getByRole("radio", { name: /ann$/i }))
            expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-ann")
        })
    })

    it("a cached open ballot that the server now says is closed stays read-only", async () => {
        storeBallotDetail("u-me", ballot({ categories: cats() }))
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ status: "closed", categories: cats() }))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        await screen.findByText(/voting is closed/i)
        fireEvent.click(screen.getByRole("radio", { name: /ann$/i }))
        expect(castVote).not.toHaveBeenCalled()
    })

    it("does not seed within 10 minutes of the close time (waits for the server)", () => {
        storeBallotDetail("u-me", ballot({ closes_at: new Date(Date.now() + 5 * 60_000).toISOString(), categories: cats() }))
        vi.mocked(fetchBallotDetail).mockReturnValue(new Promise(() => {}))
        vi.mocked(fetchMyVotes).mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.getByRole("status", { name: "Loading ballot" })).toBeTruthy()
        expect(screen.queryByRole("radio")).toBeNull()
    })

    it("another user's cached ballot is never used", () => {
        storeBallotDetail("someone-else", ballot({ categories: cats() }))
        vi.mocked(fetchBallotDetail).mockReturnValue(new Promise(() => {}))
        vi.mocked(fetchMyVotes).mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.queryByRole("radio")).toBeNull()
    })
})
