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
        expect(await screen.findByText(/no open ballots right now/i)).toBeTruthy()
    })

    it("renders cards with links, subtitle and plural copy", async () => {
        fetchMock.mockResolvedValue([mk("a"), mk("t", { round: "tiebreak", status: "closed", category_count: 1, my_vote_count: 0 })])
        renderPage()
        const link = (await screen.findByRole("link", { name: /ballot a/i })) as HTMLAnchorElement
        expect(link.getAttribute("href")).toBe("/app/ballots/a")
        expect(screen.getByText(/1 of 4 voted · Closes in 3 days/)).toBeTruthy()
        expect(screen.getByText("Continue voting")).toBeTruthy()
        expect(screen.getByText("Open", { selector: "span.inline-flex" })).toBeTruthy()
        // the closed tiebreak is only under Closed
        expect(screen.queryByText("Tiebreak")).toBeNull()
        fireEvent.click(screen.getByRole("tab", { name: "Closed 1" }))
        expect(await screen.findByText("Tiebreak")).toBeTruthy()
        expect(screen.getByText(/Voting closed · 1 category$/)).toBeTruthy()
        expect(document.body.textContent).not.toMatch(/categorie\(s\)/)
    })

    it("Open | Closed with counts; Open by default; closed ballots only under Closed", async () => {
        fetchMock.mockResolvedValue([mk("a"), mk("c", { status: "closed" })])
        renderPage()
        await screen.findByText("Ballot a")
        expect(screen.getByRole("tab", { name: "Open 1" }).getAttribute("aria-selected")).toBe("true")
        expect(screen.queryByText("Ballot c")).toBeNull()
        fireEvent.click(screen.getByRole("tab", { name: "Closed 1" }))
        expect(screen.queryByText("Ballot a")).toBeNull()
        expect(screen.getByText("Ballot c")).toBeTruthy()
        expect(screen.getByText("Closed", { selector: "span.inline-flex" })).toBeTruthy()
    })

    it("Voted tab: fully voted open ballots only, default when nothing needs voting", async () => {
        fetchMock.mockResolvedValue([mk("v", { my_vote_count: 4 }), mk("c", { status: "closed" })])
        renderPage()
        expect(await screen.findByText("Ballot v")).toBeTruthy()
        expect(screen.getByRole("tab", { name: "Voted 1" }).getAttribute("aria-selected")).toBe("true")
        expect(screen.getByText(/All voted · Closes in/)).toBeTruthy()
        expect(screen.getByText("Open", { selector: "span.inline-flex" })).toBeTruthy()
        expect(screen.queryByText("Ballot c")).toBeNull()
        fireEvent.click(screen.getByRole("tab", { name: "Open 0" }))
        expect(screen.getByText("No open ballots right now.")).toBeTruthy()
    })

    it("defaults to Closed only when nothing is open and something is closed; drafts never show", async () => {
        fetchMock.mockResolvedValue([mk("c", { status: "closed" }), mk("d", { status: "draft" })])
        renderPage()
        expect(await screen.findByText("Ballot c")).toBeTruthy()
        expect(screen.queryByText("Ballot d")).toBeNull()
        expect(screen.getByRole("tab", { name: "Closed 1" }).getAttribute("aria-selected")).toBe("true")
    })

    it("nothing at all shows the Open empty state with when voting opens", async () => {
        fetchMock.mockResolvedValue([mk("d", { status: "draft" })])
        renderPage()
        expect(await screen.findByText("No open ballots right now.")).toBeTruthy()
        expect(screen.getByText(/Voting opens when the committee publishes a ballot/)).toBeTruthy()
    })
})
