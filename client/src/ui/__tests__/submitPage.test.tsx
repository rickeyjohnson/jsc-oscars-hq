// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import SubmitBallotPage from "../../pages/SubmitBallotPage"
import { fetchBallotDetail } from "../../api/ballots"
import { castVote, clearVote, fetchMyVotes } from "../../api/votes"

vi.mock("../../api/ballots", () => ({ fetchBallotDetail: vi.fn() }))
vi.mock("../../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn() }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { user_id: "u1" } }) }))

const DAY = 86_400_000
const ballot = (o: Record<string, unknown> = {}) => ({
    id: "B1", name: "Main Ballot", status: "open", round: "main", season_id: "S", parent_ballot_id: null,
    opens_at: new Date(Date.now() - DAY).toISOString(), closes_at: new Date(Date.now() + 3 * DAY).toISOString(),
    categories: [{ id: "c1" }, { id: "c2" }], ...o,
})
const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/app/ballots/B1/submit"]}>
            <Routes>
                <Route path="/app/ballots/:ballotId/submit" element={<SubmitBallotPage />} />
                <Route path="/app/ballots/:ballotId" element={<div>vote page</div>} />
            </Routes>
        </MemoryRouter>,
    )

describe("SubmitBallotPage", () => {
    beforeEach(() => {
        cleanup()
        localStorage.clear()
        vi.mocked(fetchBallotDetail).mockReset()
        vi.mocked(fetchMyVotes).mockReset()
        vi.mocked(castVote).mockReset()
        vi.mocked(clearVote).mockReset()
    })

    it("shows the checklist with skipped categories and an enabled hold", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        renderPage()
        expect(await screen.findByRole("heading", { name: "Submit your ballot?" })).toBeTruthy()
        expect(screen.getByText("1 category skipped")).toBeTruthy()
        expect(screen.getByRole("button", { name: /hold to submit/i }).getAttribute("aria-disabled")).toBe("false")
        expect(screen.getByRole("link", { name: /not yet, back to voting/i }).getAttribute("href")).toBe("/app/ballots/B1")
    })

    it("zero votes: hold is aria-disabled", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        const hold = await screen.findByRole("button", { name: /hold to submit/i })
        expect(hold.getAttribute("aria-disabled")).toBe("true")
        expect(screen.getByText("2 categories skipped")).toBeTruthy()
    })

    it("closed ballot redirects to the ballot", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ status: "closed" }) as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        renderPage()
        expect(await screen.findByText("vote page")).toBeTruthy()
    })

    it("an already submitted ballot shows the success state and never writes votes", async () => {
        localStorage.setItem("jsc.submitted.v1.B1.u1", "2026-11-20T12:00:00.000Z")
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a", c2: "b" })
        renderPage()
        expect((await screen.findByRole("status")).textContent).toContain("Ballot submitted")
        expect(screen.getByRole("link", { name: /home/i }).getAttribute("href")).toBe("/app")
        expect(castVote).not.toHaveBeenCalled()
        expect(clearVote).not.toHaveBeenCalled()
    })

    it("completing the hold stores the submission and shows success", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a", c2: "b" })
        let t = 0
        vi.spyOn(performance, "now").mockImplementation(() => t)
        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => { t += 1000; cb(t) }, 0) as unknown as number)
        renderPage()
        fireEvent.keyDown(await screen.findByRole("button", { name: /hold to submit/i }), { key: " " })
        expect((await screen.findByRole("status", undefined, { timeout: 3000 })).textContent).toContain("Ballot submitted")
        await waitFor(() => expect(localStorage.getItem("jsc.submitted.v1.B1.u1")).toBeTruthy())
        expect(castVote).not.toHaveBeenCalled()
        vi.restoreAllMocks()
    })
})
