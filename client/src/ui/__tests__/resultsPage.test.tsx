// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import ResultsPage from "../../pages/ResultsPage"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchSeasonResults } from "../../api/results"
import { fetchMemberAvatars, fetchMembers } from "../../api/members"
import type { Category, ResultRow, Season } from "../../types"

vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn() }))
vi.mock("../../api/results", () => ({ fetchSeasonResults: vi.fn() }))
vi.mock("../../api/members", () => ({ fetchMemberAvatars: vi.fn(), fetchMembers: vi.fn() }))
let profile: { is_committee: boolean } | null = { is_committee: false }
const me = { id: "m1", name: "Micah" }
vi.mock("../../context/UserContenxt", () => ({
    useUserData: () => ({ profile, member: me, loading: false }),
}))

const season = (o: Partial<Season> = {}): Season => ({ id: "S", name: "2026", ceremony_at: new Date(Date.now() + 5 * 86_400_000).toISOString(), location: null, results_released_at: null, ...o })
const categories = [
    { id: "c1", name: "Best Hair", position: 1, nominees: [
        { id: "n1", display_name: "Ann", member_ids: ["m1"] },
        { id: "n2", display_name: "Bo", member_ids: ["m2"] },
    ] },
] as unknown as Category[]
const results = { c1: { category_id: "c1", winner_nominee_id: "n1", nominee_ids: ["n1", "n2"], top3_nominee_ids: [], decided_by: null, places: null } } as unknown as Record<string, ResultRow>

const Loc = () => <span data-testid="loc">{useLocation().pathname + useLocation().search}</span>
const renderAt = (url: string) =>
    render(
        <MemoryRouter initialEntries={[url]}>
            <Loc />
            <Routes>
                <Route path="/app/results" element={<ResultsPage />} />
            </Routes>
        </MemoryRouter>,
    )

describe("ResultsPage", () => {
    beforeEach(() => {
        cleanup()
        localStorage.clear()
        profile = { is_committee: false }
        vi.mocked(fetchCurrentSeason).mockReset()
        vi.mocked(fetchSeasonResults).mockReset().mockResolvedValue({ categories, results })
        vi.mocked(fetchMembers).mockReset().mockResolvedValue([{ id: "m1", name: "Micah" }, { id: "m2", name: "Bo" }] as never)
        vi.mocked(fetchMemberAvatars).mockReset().mockResolvedValue({})
    })

    it("shows the sealed state to members before release and requests no results", async () => {
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season())
        renderAt("/app/results")
        expect(await screen.findByText("Results are sealed.")).toBeTruthy()
        expect(screen.getByText(/revealed at the ceremony/i)).toBeTruthy()
        expect(fetchSeasonResults).not.toHaveBeenCalled()
        expect(fetchMembers).not.toHaveBeenCalled()
        expect(fetchMemberAvatars).not.toHaveBeenCalled()
    })

    it("does not request results on the leaderboard view before release either", async () => {
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season())
        renderAt("/app/results?view=leaderboard")
        expect(await screen.findByText("Results are sealed.")).toBeTruthy()
        expect(fetchSeasonResults).not.toHaveBeenCalled()
    })

    it("shows the committee the cards without a banner", async () => {
        profile = { is_committee: true }
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season())
        localStorage.setItem("jsc.envelope.S", "1")
        renderAt("/app/results")
        expect(await screen.findByRole("tab", { name: "Winners" })).toBeTruthy()
        expect(screen.queryByText(/Preview/)).toBeNull()
        expect(await screen.findByText(/1 · Best Hair/)).toBeTruthy()
        expect(fetchSeasonResults).toHaveBeenCalled()
    })

    it("shows the envelope first after release, then the winners, and not again", async () => {
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season({ results_released_at: new Date().toISOString() }))
        const first = renderAt("/app/results")
        expect(await screen.findByText("The envelope is open")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "See the winners" }))
        expect(await screen.findByText(/1 · Best Hair/)).toBeTruthy()
        expect(screen.getByText("1st place:", { exact: false })).toBeTruthy()
        first.unmount()
        renderAt("/app/results")
        expect(await screen.findByText(/1 · Best Hair/)).toBeTruthy()
        expect(screen.queryByText("The envelope is open")).toBeNull()
    })

    it("lets Escape skip the envelope", async () => {
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season({ results_released_at: new Date().toISOString() }))
        renderAt("/app/results")
        await screen.findByText("The envelope is open")
        fireEvent.keyDown(document, { key: "Escape" })
        expect(await screen.findByText(/1 · Best Hair/)).toBeTruthy()
    })

    it("switches segments and keeps the view in the URL", async () => {
        vi.mocked(fetchCurrentSeason).mockResolvedValue(season({ results_released_at: new Date().toISOString() }))
        localStorage.setItem("jsc.envelope.S", "1")
        renderAt("/app/results")
        await screen.findByText(/1 · Best Hair/)
        fireEvent.click(screen.getByRole("tab", { name: "Leaderboard" }))
        expect(screen.getByTestId("loc").textContent).toContain("view=leaderboard")
        expect(await screen.findByText("Categories you won")).toBeTruthy()
        fireEvent.click(screen.getByRole("tab", { name: "Winners" }))
        expect(await screen.findByText(/1 · Best Hair/)).toBeTruthy()
    })

    it("shows an error with retry, never the sealed state", async () => {
        vi.mocked(fetchCurrentSeason).mockRejectedValueOnce(new Error("offline"))
        renderAt("/app/results")
        await screen.findByRole("alert")
        expect(screen.queryByText("Results are sealed.")).toBeNull()
        vi.mocked(fetchCurrentSeason).mockResolvedValueOnce(season())
        fireEvent.click(screen.getByRole("button", { name: /try again/i }))
        await waitFor(() => expect(screen.getByText("Results are sealed.")).toBeTruthy())
    })
})
