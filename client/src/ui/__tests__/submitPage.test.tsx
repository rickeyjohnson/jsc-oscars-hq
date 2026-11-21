// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import SubmitBallotPage from "../../pages/SubmitBallotPage"
import { fetchBallotDetail } from "../../api/ballots"
import { castVote, clearVote, fetchMyVotes } from "../../api/votes"

vi.mock("../../api/ballots", () => ({ fetchBallotDetail: vi.fn() }))
vi.mock("../../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn() }))
const fail = vi.hoisted(() => ({ next: false }))
vi.mock("../../api/submissions", async (orig) => {
    const m = await orig<typeof import("../../api/submissions")>()
    return { ...m, submissionIO: (u: string) => { const io = m.submissionIO(u); return { ...io, submit: (b: string) => (fail.next ? ((fail.next = false), Promise.reject(new Error("x"))) : io.submit(b)) } } }
})
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

    it("some skipped: one headline and sentence, no logo or back header, dashed strip", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        renderPage()
        expect(await screen.findByRole("heading", { name: "1 skipped" })).toBeTruthy()
        expect(screen.getByText(/Skipping is fine\..*you can still change votes until/)).toBeTruthy()
        expect(screen.getByText(/1 of 2 voted/)).toBeTruthy()
        expect(screen.queryByRole("link", { name: "Back" })).toBeNull()
        // lives inside the app shell content area, not a full-screen takeover
        expect(document.querySelector(".min-h-dvh, .h-dvh")).toBeNull()
        expect(document.querySelector("svg[aria-label*='Oscars' i], img[alt*='Oscars' i]")).toBeNull()
        expect(document.querySelectorAll(".bg-pebble-sky").length).toBe(1)
        expect(document.querySelectorAll(".border-dashed").length).toBe(1)
        expect(screen.getByRole("link", { name: "Keep editing" }).getAttribute("href")).toBe("/app/ballots/B1")
    })

    it("all voted: All set?", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a", c2: "b" })
        renderPage()
        expect(await screen.findByRole("heading", { name: "All set?" })).toBeTruthy()
        expect(document.querySelectorAll(".border-dashed").length).toBe(0)
    })

    it("zero votes: submit is disabled", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        const btn = await screen.findByRole("button", { name: "Submit ballot" })
        expect((btn as HTMLButtonElement).disabled).toBe(true)
    })

    it("tapping a skipped dash jumps to that category on the Vote page; voted dashes do nothing", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        const w = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(343)
        renderPage()
        await screen.findByRole("heading", { name: "1 skipped" })
        fireEvent.click(screen.getByRole("button", { name: /Category 1:.*voted/ }))
        expect(screen.queryByText("vote page")).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: /Category 2:.*not voted/ }))
        expect(await screen.findByText("vote page")).toBeTruthy()
        w.mockRestore()
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

    it("first tap only arms (no sheet, nothing stored); Keep editing leaves", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Submit ballot" }))
        expect(screen.getByRole("button", { name: "Tap again to confirm" })).toBeTruthy()
        expect(screen.queryByRole("dialog")).toBeNull()
        expect(localStorage.getItem("jsc.submitted.v1.B1.u1")).toBeNull()
    })

    it("second tap stores the submission and shows done, with no vote writes", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a", c2: "b" })
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Submit ballot" }))
        fireEvent.click(await screen.findByRole("button", { name: "Tap again to confirm" }))
        const st = await screen.findByRole("status")
        expect(st.textContent).toContain("Ballot submitted")
        expect(st.textContent).toContain("you can still change votes until")
        await waitFor(() => expect(localStorage.getItem("jsc.submitted.v1.B1.u1")).toBeTruthy())
        expect(castVote).not.toHaveBeenCalled()
        expect(clearVote).not.toHaveBeenCalled()
    })

    it("a failed save stays on the page with an error line and Try again", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot() as never)
        vi.mocked(fetchMyVotes).mockResolvedValue({ c1: "a" })
        fail.next = true
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Submit ballot" }))
        fireEvent.click(await screen.findByRole("button", { name: "Tap again to confirm" }))
        expect((await screen.findByRole("alert")).textContent).toContain("Your votes are safe")
        expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect((await screen.findByRole("status")).textContent).toContain("Ballot submitted")
    })
})
