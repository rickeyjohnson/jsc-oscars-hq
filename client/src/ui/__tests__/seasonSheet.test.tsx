// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SeasonSheet } from "../../components/committee/SeasonSheet"
import { fetchCurrentSeason, updateSeason } from "../../api/ballots"

vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn(), updateSeason: vi.fn() }))
const season = { id: "S", name: "JSC Oscars Fall 2026", ceremony_at: "2026-12-04T20:00:00Z", location: null, results_released_at: null }

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(fetchCurrentSeason).mockReset().mockResolvedValue(season)
    vi.mocked(updateSeason).mockReset()
})
afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe("SeasonSheet", () => {
    it("shows the saved value in Eastern time so 3:00 PM Dec 4 can be confirmed", async () => {
        render(<SeasonSheet open onClose={() => {}} />)
        expect(await screen.findByText("Fri, Dec 4, 2026, 3:00 PM EST")).toBeTruthy()
        expect((screen.getByLabelText(/Ceremony time/) as HTMLInputElement).value).toBe("2026-12-04T15:00")
    })
    it("saves the picked Eastern time as UTC", async () => {
        vi.mocked(updateSeason).mockResolvedValue(true)
        render(<SeasonSheet open onClose={() => {}} />)
        await screen.findByText("Fri, Dec 4, 2026, 3:00 PM EST")
        fireEvent.change(screen.getByLabelText(/Ceremony time/), { target: { value: "2026-12-04T19:30" } })
        fireEvent.click(screen.getByRole("button", { name: "Save season" }))
        await waitFor(() => expect(updateSeason).toHaveBeenCalledWith("S", { name: "JSC Oscars Fall 2026", ceremony_at: "2026-12-05T00:30:00.000Z", location: null }))
        expect((await screen.findByRole("status")).textContent).toContain("Saved")
    })
    it("a refused save (no update right) shows a clear message", async () => {
        vi.mocked(updateSeason).mockResolvedValue(false)
        render(<SeasonSheet open onClose={() => {}} />)
        await screen.findByText("Fri, Dec 4, 2026, 3:00 PM EST")
        fireEvent.click(screen.getByRole("button", { name: "Save season" }))
        expect((await screen.findByRole("alert")).textContent).toContain("can't edit the season")
    })
})
