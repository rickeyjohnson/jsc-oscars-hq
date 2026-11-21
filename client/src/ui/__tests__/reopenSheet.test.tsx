// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReopenSheet } from "../../components/committee/ReopenSheet"
import { reopenBallot } from "../../api/ballots"
import { REOPEN_UNAVAILABLE } from "../../lib/reopen"

vi.mock("../../api/ballots", () => ({ reopenBallot: vi.fn() }))

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(reopenBallot).mockReset()
})
afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

const show = (onDone = () => {}) => render(<ReopenSheet open onClose={() => {}} ballotId="b1" ballotName="Fall Awards" voteCount={11} onDone={onDone} />)

describe("ReopenSheet", () => {
    it("explains the effects, defaults the close time to about +24h, and has a single Close", () => {
        show()
        expect(screen.getByText(/The 11 votes already cast are kept/)).toBeTruthy()
        expect(screen.getByText(/recorded again when it closes/)).toBeTruthy()
        const field = screen.getByLabelText("Voting closes") as HTMLInputElement
        const hours = (new Date(field.value).getTime() - Date.now()) / 3_600_000
        expect(hours).toBeGreaterThan(23)
        expect(hours).toBeLessThanOrEqual(24)
        expect(screen.getAllByRole("button", { name: /close/i }).filter((b) => b.getAttribute("aria-label") === "Close")).toHaveLength(1)
    })
    it("calls the api with the picked time as UTC and reports done", async () => {
        vi.mocked(reopenBallot).mockResolvedValue()
        const done = vi.fn()
        show(done)
        fireEvent.click(screen.getByRole("button", { name: "Reopen ballot" }))
        await waitFor(() => expect(done).toHaveBeenCalled())
        expect(vi.mocked(reopenBallot).mock.calls[0][0]).toBe("b1")
        expect(vi.mocked(reopenBallot).mock.calls[0][1]).toMatch(/Z$/)
    })
    it("a past time is refused before calling the api", async () => {
        show()
        fireEvent.change(screen.getByLabelText("Voting closes"), { target: { value: "2020-01-01T10:00" } })
        fireEvent.click(screen.getByRole("button", { name: "Reopen ballot" }))
        expect((await screen.findByRole("alert")).textContent).toContain("future")
        expect(reopenBallot).not.toHaveBeenCalled()
    })
    it("a database that lacks the function shows the not available yet message", async () => {
        vi.mocked(reopenBallot).mockRejectedValue({ code: "PGRST202", message: "Could not find the function public.reopen_ballot" })
        show()
        fireEvent.click(screen.getByRole("button", { name: "Reopen ballot" }))
        expect((await screen.findByRole("alert")).textContent).toBe(REOPEN_UNAVAILABLE)
    })
})
