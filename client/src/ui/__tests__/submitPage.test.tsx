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
        expect(screen.getByText("1 of 2 categories voted, 1 skipped.")).toBeTruthy()
        // like the envelope page: no logo, no ballot-name eyebrow, no back header (Back to ballot is the way out)
        expect(screen.queryByText("MAIN BALLOT")).toBeNull()
        expect(document.querySelector("svg[aria-label*='Oscars' i], img[alt*='Oscars' i]")).toBeNull()
        expect(screen.queryByRole("link", { name: "Back" })).toBeNull()
        expect((screen.getByRole("button", { name: /submit my ballot/i }) as HTMLButtonElement).disabled).toBe(false)
        expect(screen.getByRole("link", { name: "Back to ballot" }).getAttribute("href")).toBe("/app/ballots/B1")
    })

    it("zero votes: hold is aria-disabled", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        const hold = await screen.findByRole("button", { name: /submit my ballot/i })
        expect((hold as HTMLButtonElement).disabled).toBe(true)
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

    it("tapping Submit opens a confirm sheet; Keep editing closes it without submitting", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: /submit my ballot/i }))
        const dlg = await screen.findByRole("dialog", { name: "Submit your ballot?" })
        expect(dlg.textContent).toContain("1 of 2 categories voted, 1 skipped.")
        fireEvent.click(screen.getByRole("button", { name: "Keep editing" }))
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(localStorage.getItem("jsc.submitted.v1.B1.u1")).toBeNull()
    })

    it("confirming stores the submission and shows success, with no vote writes", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a", c2: "b" })
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: /submit my ballot/i }))
        fireEvent.click(await screen.findByRole("button", { name: "Submit ballot" }))
        expect((await screen.findByRole("status")).textContent).toContain("Ballot submitted")
        await waitFor(() => expect(localStorage.getItem("jsc.submitted.v1.B1.u1")).toBeTruthy())
        expect(castVote).not.toHaveBeenCalled()
        expect(clearVote).not.toHaveBeenCalled()
    })
})
