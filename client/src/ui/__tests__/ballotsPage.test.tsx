// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import BallotsPage from "../../pages/BallotsPage"
import { fetchBallotSummaries } from "../../api/ballots"
import type { BallotSummary } from "../../lib/voting"

vi.mock("../../api/ballots", () => ({ fetchBallotSummaries: vi.fn() }))

const DAY = 86_400_000
const mk = (id: string, o: Partial<BallotSummary> = {}): BallotSummary => ({
    id,
    season_id: "S",
    parent_ballot_id: null,
    name: `Ballot ${id}`,
    round: "main",
    status: "open",
    opens_at: new Date(Date.now() - DAY).toISOString(),
    closes_at: new Date(Date.now() + 3 * DAY + 60_000).toISOString(),
    category_count: 4,
    my_vote_count: 1,
    ...o,
})
const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/app/ballots"]}>
            <BallotsPage />
        </MemoryRouter>,
    )
const fetchMock = vi.mocked(fetchBallotSummaries)

describe("BallotsPage", () => {
    beforeEach(() => {
        fetchMock.mockReset()
    })

    it("shows skeleton while loading", () => {
        fetchMock.mockReturnValue(new Promise(() => {}))
        renderPage()
        expect(screen.getByRole("status", { name: /loading ballots/i })).toBeTruthy()
        expect(screen.queryByText("Loading…")).toBeNull()
    })

    it("shows error and retries", async () => {
        fetchMock.mockRejectedValueOnce(new Error("offline"))
        renderPage()
        await screen.findByRole("alert")
        fetchMock.mockResolvedValueOnce([mk("a")])
        fireEvent.click(screen.getByRole("button", { name: /try again/i }))
        expect(await screen.findByText("Ballot a")).toBeTruthy()
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("shows an empty state when there are no ballots", async () => {
        fetchMock.mockResolvedValue([])
        renderPage()
        expect(await screen.findByText(/no ballots yet/i)).toBeTruthy()
    })

    it("renders cards with links, subtitle and plural copy", async () => {
        fetchMock.mockResolvedValue([mk("a"), mk("t", { round: "tiebreak", status: "closed", category_count: 1, my_vote_count: 0 })])
        renderPage()
        const link = (await screen.findByRole("link", { name: /ballot a/i })) as HTMLAnchorElement
        expect(link.getAttribute("href")).toBe("/app/ballots/a")
        expect(screen.getByText(/1 of 4 voted · Closes in 3 days/)).toBeTruthy()
        expect(screen.getByText("Continue voting")).toBeTruthy()
        expect(screen.getByText("Tiebreak")).toBeTruthy()
        expect(screen.getByText(/Voting closed · 1 category$/)).toBeTruthy()
        expect(document.body.textContent).not.toMatch(/categorie\(s\)/)
    })

    it("filters and shows a filtered empty state only when the filtered list is empty", async () => {
        fetchMock.mockResolvedValue([mk("a")])
        renderPage()
        await screen.findByText("Ballot a")
        fireEvent.click(screen.getByRole("tab", { name: "Closed" }))
        expect(screen.queryByText("Ballot a")).toBeNull()
        expect(screen.getByText("No closed ballots yet.")).toBeTruthy()
        fireEvent.click(screen.getByRole("tab", { name: "Open" }))
        await waitFor(() => expect(screen.getByText("Ballot a")).toBeTruthy())
        expect(screen.queryByText(/no open ballots/i)).toBeNull()
    })
})
