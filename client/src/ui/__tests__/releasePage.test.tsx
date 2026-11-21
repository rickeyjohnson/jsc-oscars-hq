// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import ReleasePage from "../../pages/committee/ReleasePage"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus, releaseSeasonResults } from "../../api/results"

vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn() }))
vi.mock("../../api/results", () => ({ fetchReleaseStatus: vi.fn(), releaseSeasonResults: vi.fn() }))

const status = (o: { released?: boolean; winners?: boolean } = {}) => ({
    season: { id: "S", name: "2026", ceremony_at: null, location: null, results_released_at: o.released ? "2026-01-01T00:00:00Z" : null },
    ballots: [{ id: "b1", status: "closed", round: "main", closes_at: "2020-01-01T00:00:00Z" }],
    mainCategoryIds: ["c1"],
    results: o.winners === false ? {} : { c1: { winner_nominee_id: "n1" } },
})
const renderPage = () => render(<MemoryRouter><ReleasePage /></MemoryRouter>)

describe("ReleasePage", () => {
    beforeEach(() => {
        cleanup()
        vi.mocked(fetchCurrentSeason).mockReset().mockResolvedValue({ id: "S" } as never)
        vi.mocked(fetchReleaseStatus).mockReset()
        vi.mocked(releaseSeasonResults).mockReset()
    })

    it("not ready: hold is aria-disabled with the reason beneath; summary expands; one Go to tally jumps to the failing ballot", async () => {
        vi.mocked(fetchReleaseStatus).mockResolvedValue(status({ winners: false }) as never)
        renderPage()
        const hold = await screen.findByRole("button", { name: /hold to open the envelope/i })
        expect(hold.getAttribute("aria-disabled")).toBe("true")
        expect(screen.getByText("Finish the 1 thing above to unlock.")).toBeTruthy()
        const summary = screen.getByRole("button", { name: /1 thing left/ })
        expect(screen.queryByText(/0 of 1 categories have a winner/)).toBeNull()
        fireEvent.click(summary)
        expect(screen.getByText(/0 of 1 categories have a winner/)).toBeTruthy()
        expect(screen.getAllByRole("link", { name: "Go to tally" })).toHaveLength(1)
        expect(screen.getByRole("link", { name: "Go to tally" }).getAttribute("href")).toBe("/app/profile/ballots/b1")
        expect(screen.getByRole("link", { name: "Not yet" })).toBeTruthy()
        expect(screen.queryByText("Members never see vote counts")).toBeNull()
    })

    it("ready: hold is enabled, no Go to tally", async () => {
        vi.mocked(fetchReleaseStatus).mockResolvedValue(status() as never)
        renderPage()
        const hold = await screen.findByRole("button", { name: /hold to open the envelope/i })
        expect(hold.getAttribute("aria-disabled")).toBe("false")
        expect(screen.getByText("Everything is ready")).toBeTruthy()
        expect(screen.queryByRole("link", { name: "Go to tally" })).toBeNull()
    })

    it("an already released season shows how many winners were revealed", async () => {
        vi.mocked(fetchReleaseStatus).mockResolvedValue(status({ released: true }) as never)
        renderPage()
        const st = await screen.findByRole("status")
        expect(st.textContent).toContain("The envelope is open")
        expect(st.textContent).toContain("1 winner is live for every member.")
        expect(screen.getByRole("link", { name: "See results" }).getAttribute("href")).toBe("/app/results")
        expect(releaseSeasonResults).not.toHaveBeenCalled()
    })

    it("a release error shows the mapped alert, not the raw message", async () => {
        vi.mocked(fetchReleaseStatus).mockResolvedValue(status() as never)
        vi.mocked(releaseSeasonResults).mockRejectedValue(new Error("raw db failure"))
        const raf = vi.spyOn(window, "requestAnimationFrame")
        let t = 0
        vi.spyOn(performance, "now").mockImplementation(() => t)
        raf.mockImplementation((cb) => setTimeout(() => { t += 1000; cb(t) }, 0) as unknown as number)
        renderPage()
        const hold = await screen.findByRole("button", { name: /hold to open the envelope/i })
        fireEvent.keyDown(hold, { key: " " })
        const alert = await screen.findByRole("alert", undefined, { timeout: 3000 })
        expect(alert.textContent).toBe("Couldn't open the envelope. Check your connection and hold again.")
        await waitFor(() => expect(releaseSeasonResults).toHaveBeenCalledTimes(1))
        vi.restoreAllMocks()
    })
})
