// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import MyocPage from "../../pages/myoc/MyocPage"
import CategoryList from "../../pages/ballot-builder/CategoryList"
import { ConfirmProvider } from "../ConfirmProvider"
import { createMyocWindow, editIdea, fetchMyocWindows, fetchMyIdeas, fetchReviewIdeas, reviewIdea, submitIdea, withdrawIdea, updateMyocWindow } from "../../api/myoc"
import { fetchCurrentSeason } from "../../api/ballots"
import type { MyocIdea, MyocWindow, ReviewIdea } from "../../lib/myoc"

const user = vi.hoisted(() => ({ committee: false }))
vi.mock("../../api/myoc", () => ({
    fetchMyocWindows: vi.fn(), fetchMyIdeas: vi.fn(), fetchReviewIdeas: vi.fn(), submitIdea: vi.fn(), editIdea: vi.fn(), withdrawIdea: vi.fn(), reviewIdea: vi.fn(), createMyocWindow: vi.fn(), updateMyocWindow: vi.fn(),
}))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn() }))
vi.mock("../../api/members", () => ({ fetchMemberDirectory: vi.fn().mockResolvedValue([]), fetchMembers: vi.fn().mockResolvedValue([]) }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { is_committee: user.committee }, member: null }) }))

const hrs = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()
const win = (o: number, c: number): MyocWindow => ({ id: "W1", season_id: "S1", opens_at: hrs(o), closes_at: hrs(c) })
const idea = (id: string, over: Partial<MyocIdea> = {}): MyocIdea => ({
    id, window_id: "W1", author_id: "u1", name: `Idea ${id}`, description: "", hint: null, status: "submitted", merged_into: null, assigned_category: null, created_at: "2026-01-01", updated_at: "", ...over,
})
const review = (id: string, over: Partial<ReviewIdea> = {}): ReviewIdea => ({ ...idea(id), author: { id: "m1", name: "Micah" }, ...over })

const Probe = () => {
    const l = useLocation()
    return <p data-state={JSON.stringify(l.state)}>builder</p>
}
const renderPage = (path = "/app/profile/settings/myoc") =>
    render(
        <ConfirmProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route path="/app/profile/settings/myoc" element={<MyocPage />} />
                    <Route path="/app/profile/settings" element={<p>settings</p>} />
                    <Route path="/app/profile/ballots/create" element={<Probe />} />
                </Routes>
            </MemoryRouter>
        </ConfirmProvider>,
    )

beforeEach(() => {
    user.committee = false
    vi.spyOn(console, "error").mockImplementation(() => {})
    for (const f of [fetchMyocWindows, fetchMyIdeas, fetchReviewIdeas, submitIdea, editIdea, withdrawIdea, reviewIdea, createMyocWindow, updateMyocWindow, fetchCurrentSeason]) vi.mocked(f).mockReset()
    vi.mocked(fetchCurrentSeason).mockResolvedValue({ id: "S1", name: "Spring 2027", ceremony_at: null, location: null, results_released_at: null } as never)
    vi.mocked(fetchMyocWindows).mockResolvedValue([win(-1, 48)])
    vi.mocked(fetchMyIdeas).mockResolvedValue([])
})

describe("member view", () => {
    it("says MYOC isn't available yet when the tables do not exist", async () => {
        vi.mocked(fetchMyocWindows).mockRejectedValue({ code: "PGRST205", message: "Could not find the table" })
        renderPage()
        expect(await screen.findByText("Make Your Own Categories isn't available yet.")).toBeTruthy()
    })
    it("shows not open when there is no window", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([])
        renderPage()
        expect(await screen.findByText("Make Your Own Categories isn't open")).toBeTruthy()
    })
    it("members get no committee tabs", async () => {
        renderPage()
        await screen.findByRole("form", { name: "Suggest a category" })
        expect(screen.queryByRole("tab", { name: "Review" })).toBeNull()
        expect(screen.queryByText(/of 5/)).toBeNull()
    })
    it("validates before submitting, then submits and clears", async () => {
        renderPage()
        const form = await screen.findByRole("form", { name: "Suggest a category" })
        fireEvent.click(within(form).getByRole("button", { name: "Submit idea" }))
        expect(await screen.findByText("Give it a name")).toBeTruthy()
        expect(submitIdea).not.toHaveBeenCalled()
        vi.mocked(submitIdea).mockResolvedValue()
        fireEvent.change(screen.getByLabelText("Category name"), { target: { value: "  Best Lurker  " } })
        fireEvent.click(screen.getByRole("radio", { name: "A group" }))
        fireEvent.click(within(form).getByRole("button", { name: "Submit idea" }))
        await waitFor(() => expect(submitIdea).toHaveBeenCalledWith("W1", { name: "  Best Lurker  ", description: "", hint: "group" }))
        await waitFor(() => expect((screen.getByLabelText("Category name") as HTMLInputElement).value).toBe(""))
    })
    it("explains the old database limit instead of crashing", async () => {
        vi.mocked(submitIdea).mockRejectedValue({ message: "suggestion limit reached" })
        renderPage()
        await screen.findByRole("form", { name: "Suggest a category" })
        fireEvent.change(screen.getByLabelText("Category name"), { target: { value: "x" } })
        fireEvent.click(screen.getByRole("button", { name: "Submit idea" }))
        expect((await screen.findByRole("alert")).textContent).toMatch(/old limit; ask a committee member/)
    })
    it("keeps the form open however many ideas there are", async () => {
        vi.mocked(fetchMyIdeas).mockResolvedValue(Array.from({ length: 12 }, (_, i) => idea(`n${i}`)))
        renderPage()
        expect(await screen.findByRole("button", { name: "Submit idea" })).toBeTruthy()
        expect(screen.queryByText(/used all/)).toBeNull()
    })
    it("closed: no form and no edit or withdraw", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([win(-48, -1)])
        vi.mocked(fetchMyIdeas).mockResolvedValue([idea("a")])
        renderPage()
        expect(await screen.findByText("Make Your Own Categories is closed")).toBeTruthy()
        expect(screen.getByText("Idea a")).toBeTruthy()
        expect(screen.queryByRole("form", { name: "Suggest a category" })).toBeNull()
        expect(screen.queryByRole("button", { name: /^Edit/ })).toBeNull()
        expect(screen.queryByRole("button", { name: /^Withdraw/ })).toBeNull()
    })
    it("upcoming shows when it opens", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([win(24, 96)])
        renderPage()
        expect(await screen.findByText("Make Your Own Categories isn't open yet")).toBeTruthy()
        expect(screen.queryByRole("form", { name: "Suggest a category" })).toBeNull()
    })
    it("only ever labels ideas Submitted or Withdrawn", async () => {
        vi.mocked(fetchMyIdeas).mockResolvedValue([idea("a", { status: "accepted" }), idea("b", { status: "rejected" }), idea("c", { status: "merged", merged_into: "a" }), idea("d", { status: "withdrawn" })])
        renderPage()
        await screen.findByText("Idea a")
        expect(screen.getAllByText("Submitted")).toHaveLength(3)
        expect(screen.getByText("Withdrawn")).toBeTruthy()
        expect(screen.queryByText(/accepted|rejected|merged/i)).toBeNull()
        // the committee has acted on these, so no edit/withdraw is offered
        expect(screen.queryByRole("button", { name: /^Edit/ })).toBeNull()
    })
    it("edits an idea in a sheet with a single Close", async () => {
        vi.mocked(fetchMyIdeas).mockResolvedValue([idea("a")])
        vi.mocked(editIdea).mockResolvedValue()
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Edit Idea a" }))
        const dialog = await screen.findByRole("dialog", { name: "Edit idea" })
        expect(within(dialog).getAllByRole("button", { name: "Close" })).toHaveLength(1)
        fireEvent.change(within(dialog).getByLabelText("Category name"), { target: { value: "Renamed" } })
        fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }))
        await waitFor(() => expect(editIdea).toHaveBeenCalledWith("a", { name: "Renamed", description: "", hint: null }))
    })
    it("withdraws only after confirming", async () => {
        vi.mocked(fetchMyIdeas).mockResolvedValue([idea("a")])
        vi.mocked(withdrawIdea).mockResolvedValue()
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Withdraw Idea a" }))
        const confirm = await screen.findByRole("alertdialog")
        expect(withdrawIdea).not.toHaveBeenCalled()
        fireEvent.click(within(confirm).getByRole("button", { name: "Withdraw idea" }))
        await waitFor(() => expect(withdrawIdea).toHaveBeenCalledWith("a"))
    })
    it("keeping the idea does nothing", async () => {
        vi.mocked(fetchMyIdeas).mockResolvedValue([idea("a")])
        renderPage()
        fireEvent.click(await screen.findByRole("button", { name: "Withdraw Idea a" }))
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Keep it" }))
        await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
        expect(withdrawIdea).not.toHaveBeenCalled()
    })
})

describe("committee", () => {
    beforeEach(() => {
        user.committee = true
    })
    it("shows the tabs and switches to Review", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a")])
        renderPage()
        fireEvent.click(await screen.findByRole("tab", { name: "Review" }))
        expect(await screen.findByRole("button", { name: /Review Idea a, from Micah/ })).toBeTruthy()
    })
    it("filters the inbox", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a"), review("b", { status: "accepted" }), review("c", { status: "rejected" })])
        renderPage("/app/profile/settings/myoc?tab=review")
        await screen.findByRole("button", { name: /Review Idea a/ })
        expect(screen.queryByRole("button", { name: /Review Idea b/ })).toBeNull() // default filter is New
        fireEvent.click(screen.getByRole("button", { name: /^Accepted/ }))
        expect(screen.getByRole("button", { name: /Review Idea b/ })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /^All/ }))
        expect(screen.getAllByRole("button", { name: /^Review / })).toHaveLength(3)
    })
    it("renders every idea as its own equal card in a responsive grid", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a", { name: "A very long title ".repeat(10) }), review("b")])
        renderPage("/app/profile/settings/myoc?tab=review")
        const first = await screen.findByRole("button", { name: /Review A very long/ })
        const list = first.closest("ul")!
        expect(list.className).toMatch(/grid-cols-1/)
        expect(list.className).toMatch(/md:grid-cols-2/)
        expect(list.className).toMatch(/xl:grid-cols-3/)
        expect(list.className).not.toMatch(/divide-y|bg-surface/)
        const cards = screen.getAllByRole("button", { name: /^Review / })
        expect(new Set(cards.map((b) => b.className.match(/h-32/)?.[0])).size).toBe(1)
        expect(cards.every((b) => /rounded-card/.test(b.className) && /bg-surface/.test(b.className))).toBe(true)
        expect(first.querySelector(".line-clamp-2")).toBeTruthy()
    })
    it("accepts an idea with edited wording and a category label", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a")])
        vi.mocked(reviewIdea).mockResolvedValue()
        renderPage("/app/profile/settings/myoc?tab=review")
        fireEvent.click(await screen.findByRole("button", { name: /Review Idea a/ }))
        const dialog = await screen.findByRole("dialog", { name: "Review idea" })
        expect(within(dialog).getByText("Micah")).toBeTruthy() // the committee sees the submitter
        fireEvent.change(within(dialog).getByLabelText("Category name"), { target: { value: "Better name" } })
        fireEvent.change(within(dialog).getByLabelText(/Category label/), { target: { value: "Superlatives" } })
        fireEvent.click(within(dialog).getByRole("button", { name: "Accept" }))
        await waitFor(() => expect(reviewIdea).toHaveBeenCalledWith("a", { name: "Better name", description: "", hint: null, assigned_category: "Superlatives", status: "accepted" }))
    })
    it("rejects and merges", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a"), review("b")])
        vi.mocked(reviewIdea).mockResolvedValue()
        renderPage("/app/profile/settings/myoc?tab=review")
        fireEvent.click(await screen.findByRole("button", { name: /Review Idea a/ }))
        let dialog = await screen.findByRole("dialog", { name: "Review idea" })
        fireEvent.click(within(dialog).getByRole("button", { name: "Reject" }))
        await waitFor(() => expect(reviewIdea).toHaveBeenCalledWith("a", expect.objectContaining({ status: "rejected" })))
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        fireEvent.click(await screen.findByRole("button", { name: /Review Idea b/ }))
        dialog = await screen.findByRole("dialog", { name: "Review idea" })
        fireEvent.change(within(dialog).getByLabelText("Merge into another idea"), { target: { value: "a" } })
        fireEvent.click(within(dialog).getByRole("button", { name: "Merge" }))
        await waitFor(() => expect(reviewIdea).toHaveBeenCalledWith("b", expect.objectContaining({ status: "merged", merged_into: "a" })))
    })
    it("opens the builder with the accepted ideas, grouped and trimmed", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([
            review("a", { status: "accepted", name: "Zed", hint: "thing", assigned_category: "Zeta", created_at: "1" }),
            review("b", { status: "accepted", name: "Alpha ", description: "d", hint: "group", assigned_category: "Alpha", created_at: "2" }),
            review("c"),
        ])
        renderPage("/app/profile/settings/myoc?tab=review")
        fireEvent.click(await screen.findByRole("button", { name: "Build ballot from 2 accepted" }))
        const probe = await screen.findByText("builder")
        expect(JSON.parse(probe.getAttribute("data-state") ?? "null")).toEqual({ myocIdeas: [{ name: "Alpha", description: "d", hint: "group" }, { name: "Zed", description: "", hint: "thing" }] })
    })
    it("disables the build button with nothing accepted", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a")])
        renderPage("/app/profile/settings/myoc?tab=review")
        await screen.findByRole("button", { name: /Review Idea a/ })
        expect((screen.getByRole("button", { name: "Accept ideas to build a ballot" }) as HTMLButtonElement).disabled).toBe(true)
    })
    it("a withdrawn idea is read-only in the sheet", async () => {
        vi.mocked(fetchReviewIdeas).mockResolvedValue([review("a", { status: "withdrawn" })])
        renderPage("/app/profile/settings/myoc?tab=review")
        fireEvent.click(await screen.findByRole("button", { name: /^Withdrawn/ }))
        fireEvent.click(await screen.findByRole("button", { name: /Review Idea a/ }))
        const dialog = await screen.findByRole("dialog", { name: "Review idea" })
        expect(within(dialog).getByText(/withdrew this idea/)).toBeTruthy()
        expect(within(dialog).queryByRole("button", { name: "Accept" })).toBeNull()
    })
    it("creates a window with validated times", async () => {
        vi.mocked(fetchMyocWindows).mockResolvedValue([])
        vi.mocked(createMyocWindow).mockResolvedValue()
        renderPage("/app/profile/settings/myoc?tab=window")
        const form = await screen.findByRole("form", { name: "Make Your Own Categories window times" })
        fireEvent.change(within(form).getByLabelText("Closes"), { target: { value: "2020-01-01T10:00" } })
        fireEvent.click(within(form).getByRole("button", { name: "Open the window" }))
        expect((await screen.findByRole("alert")).textContent).toMatch(/after it opens|future/)
        expect(createMyocWindow).not.toHaveBeenCalled()
        fireEvent.change(within(form).getByLabelText("Opens"), { target: { value: "2030-01-01T10:00" } })
        fireEvent.change(within(form).getByLabelText("Closes"), { target: { value: "2030-01-06T10:00" } })
        fireEvent.click(within(form).getByRole("button", { name: "Open the window" }))
        await waitFor(() => expect(createMyocWindow).toHaveBeenCalledWith("S1", "2030-01-01T10:00", "2030-01-06T10:00"))
    })
    it("closes an open window now, after confirming", async () => {
        vi.mocked(updateMyocWindow).mockResolvedValue()
        renderPage("/app/profile/settings/myoc?tab=window")
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Close now" }))
        await waitFor(() => expect(updateMyocWindow).toHaveBeenCalledWith("W1", { closes_at: expect.any(String) }))
    })
    it("a member who guesses ?tab=review still gets the member view", async () => {
        user.committee = false
        renderPage("/app/profile/settings/myoc?tab=review")
        expect(await screen.findByRole("form", { name: "Suggest a category" })).toBeTruthy()
        expect(fetchReviewIdeas).not.toHaveBeenCalled()
    })
})

describe("builder", () => {
    it("tags categories that came from MYOC", () => {
        const base = { description: "", order: 0, nominee_mode: "everyone" as const, allow_member_add: false, nominees: [] }
        render(<CategoryList categories={[{ ...base, id: "1", name: "From MYOC", source: "myoc" }, { ...base, id: "2", name: "Typed by hand", order: 1 }]} onChange={() => {}} onEdit={() => {}} />)
        expect(screen.getAllByText("Own categories")).toHaveLength(1)
    })
})
