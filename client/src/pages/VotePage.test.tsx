// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import VotePage from "./VotePage"
import { fetchBallotDetail } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { addNominee, castVote, clearVote, fetchMyVotes } from "../api/votes"
import { opensAtLabel } from "../lib/time"
import { ballot, category, deferred, MEMBERS, nominee } from "../test/fixtures"

const userState = vi.hoisted(() => ({ value: { member: { id: "m-me", name: "Me", user_id: "u-me" } as unknown, loading: false } }))

vi.mock("../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn(), addNominee: vi.fn() }))
vi.mock("../api/ballots", () => ({ fetchBallotDetail: vi.fn() }))
vi.mock("../api/members", () => ({ fetchMembers: vi.fn() }))
vi.mock("../context/UserContenxt", () => ({ useUserData: () => userState.value }))

// ADAPTER (Task 21 may change these helpers, never the assertions)
const radio = (name: RegExp) => screen.getByRole("radio", { name })
// One category per page: only the current region is visible; the others are display:none.
const section = (cat: RegExp) => screen.getByRole("region", { name: cat })
const expandCard = async (_cat: RegExp) => {} // options are always shown now
// Tapping the chosen card again clears the vote (no separate Clear button).
const clearButton = (_cat: RegExp) => screen.getByRole("radio", { checked: true })
const nextUnvoted = () => screen.getByRole("button", { name: /next unvoted/i })
const loadError = () => screen.findByText(/couldn't load/i)
// END ADAPTER

const C1 = /best picture/i
const C2 = /best dressed/i
// accessible name is the avatar initial plus the name (e.g. "AAnn"), so match the end
const ANN = /ann$/i
const BO = /bo$/i

const twoCategories = (c1: Partial<Parameters<typeof category>[3]> = {}) => [
    category("c1", "Best Picture", [nominee("n-ann", "Ann"), nominee("n-bo", "Bo")], c1),
    category("c2", "Best Dressed", [nominee("n-cy", "Cy"), nominee("n-di", "Di")]),
]

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={["/app/ballots/B1"]}>
            <Routes>
                <Route path="/app/ballots/:ballotId" element={<VotePage />} />
            </Routes>
        </MemoryRouter>,
    )

const loaded = async (b = ballot({ categories: twoCategories() }), votes: Record<string, string> = {}) => {
    vi.mocked(fetchBallotDetail).mockResolvedValue(b)
    vi.mocked(fetchMyVotes).mockResolvedValue(votes)
    renderPage()
    await screen.findByRole("region", { name: C1 })
}

beforeEach(() => {
    vi.resetAllMocks()
    userState.value = { member: { id: "m-me", name: "Me", user_id: "u-me" }, loading: false }
    vi.mocked(castVote).mockResolvedValue(undefined)
    vi.mocked(clearVote).mockResolvedValue(undefined)
    vi.mocked(fetchMembers).mockResolvedValue([])
    Element.prototype.scrollIntoView = vi.fn()
})

describe("VotePage behavior", () => {
    it("optimistic vote then save", async () => {
        await loaded()
        const d = deferred()
        vi.mocked(castVote).mockReturnValueOnce(d.promise)
        fireEvent.click(radio(ANN))
        // save still in flight, but the pick is already shown as chosen
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-ann"))
        expect(within(section(C1)).getByText(/saving/i)).toBeTruthy()
        await expandCard(C1)
        expect(radio(ANN).getAttribute("aria-checked")).toBe("true")
        d.resolve()
        await waitFor(() => expect(within(section(C1)).queryByText(/saving/i)).toBeNull())
        expect(within(section(C1)).getByText(/voted/i)).toBeTruthy()
        expect(screen.getByText(/1 of 2 voted/i)).toBeTruthy()
    })

    it("failed save reverts and alerts in that category only", async () => {
        await loaded()
        vi.mocked(castVote).mockRejectedValueOnce(new Error("nope"))
        fireEvent.click(radio(ANN))
        const alert = await within(section(C1)).findByRole("alert")
        expect(alert.textContent).toMatch(/couldn't save/i)
        expect(radio(ANN).getAttribute("aria-checked")).toBe("false")
        expect(radio(BO).getAttribute("aria-checked")).toBe("false")
        expect(within(section(C2)).queryByRole("alert")).toBeNull()
        expect(screen.getByText(/0 of 2 voted/i)).toBeTruthy()
    })

    it("failed save falls back to the last confirmed vote", async () => {
        await loaded(undefined, { c1: "n-ann" })
        await expandCard(C1)
        vi.mocked(castVote).mockRejectedValueOnce(new Error("nope"))
        fireEvent.click(radio(BO))
        await within(section(C1)).findByRole("alert")
        await expandCard(C1)
        expect(radio(ANN).getAttribute("aria-checked")).toBe("true")
        expect(radio(BO).getAttribute("aria-checked")).toBe("false")
    })

    it("rapid taps save in tap order", async () => {
        await loaded()
        const d1 = deferred()
        const d2 = deferred()
        vi.mocked(castVote).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
        fireEvent.click(radio(ANN))
        await expandCard(C1)
        fireEvent.click(radio(BO))
        // Bo is queued behind Ann: only one request is in flight
        await new Promise((r) => setTimeout(r, 20))
        expect(castVote).toHaveBeenCalledTimes(1)
        d1.resolve()
        await waitFor(() => expect(castVote).toHaveBeenCalledTimes(2))
        expect(vi.mocked(castVote).mock.calls[0]).toEqual(["B1", "c1", "n-ann"])
        expect(vi.mocked(castVote).mock.calls.at(-1)).toEqual(["B1", "c1", "n-bo"])
        d2.resolve()
        await waitFor(() => expect(within(section(C1)).queryByText(/saving/i)).toBeNull())
        await expandCard(C1)
        expect(radio(BO).getAttribute("aria-checked")).toBe("true")
        expect(radio(ANN).getAttribute("aria-checked")).toBe("false")
    })

    it("a stale failure does not override a newer successful tap", async () => {
        await loaded()
        const d1 = deferred()
        const d2 = deferred()
        vi.mocked(castVote).mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise)
        fireEvent.click(radio(ANN))
        await expandCard(C1)
        fireEvent.click(radio(BO))
        d1.reject(new Error("stale"))
        await waitFor(() => expect(castVote).toHaveBeenCalledTimes(2))
        d2.resolve()
        await waitFor(() => expect(within(section(C1)).queryByText(/saving/i)).toBeNull())
        expect(within(section(C1)).queryByRole("alert")).toBeNull()
        await expandCard(C1)
        expect(radio(BO).getAttribute("aria-checked")).toBe("true")
        expect(radio(ANN).getAttribute("aria-checked")).toBe("false")
    })

    it("clear removes the vote", async () => {
        await loaded(undefined, { c1: "n-ann" })
        await expandCard(C1)
        fireEvent.click(clearButton(C1))
        await waitFor(() => expect(clearVote).toHaveBeenCalledWith("B1", "c1"))
        await waitFor(() => expect(within(section(C1)).queryByText(/saving/i)).toBeNull())
        expect(radio(ANN).getAttribute("aria-checked")).toBe("false")
        expect(radio(BO).getAttribute("aria-checked")).toBe("false")
        expect(screen.getByText(/0 of 2 voted/i)).toBeTruthy()
    })

    it("closed ballot is read-only", async () => {
        await loaded(ballot({ status: "closed", categories: twoCategories() }))
        for (const r of screen.getAllByRole("radio")) expect((r as HTMLButtonElement).disabled).toBe(true)
        expect(screen.getByRole("status").textContent).toMatch(/voting is closed/i)
        fireEvent.click(radio(ANN))
        expect(castVote).not.toHaveBeenCalled()
    })

    it("upcoming ballot says when it opens", async () => {
        const opens = new Date(Date.now() + 86_400_000)
        await loaded(ballot({ opens_at: opens.toISOString(), closes_at: new Date(Date.now() + 3 * 86_400_000).toISOString(), categories: twoCategories() }))
        expect(screen.getByRole("status").textContent).toBe(opensAtLabel(opens))
        for (const r of screen.getAllByRole("radio")) expect((r as HTMLButtonElement).disabled).toBe(true)
    })

    it("load failure shows an error", async () => {
        vi.mocked(fetchBallotDetail).mockRejectedValue(new Error("boom"))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderPage()
        expect(await loadError()).toBeTruthy()
    })

    it("no linked member explains why", async () => {
        userState.value = { member: null, loading: false }
        renderPage()
        expect(await screen.findByText(/isn't linked/i)).toBeTruthy()
        expect(fetchBallotDetail).not.toHaveBeenCalled()
    })

    it("waits for the member to load before fetching", async () => {
        userState.value = { member: null, loading: true }
        renderPage()
        expect(screen.getByText(/loading/i)).toBeTruthy()
        expect(screen.queryByText(/isn't linked/i)).toBeNull()
        expect(fetchBallotDetail).not.toHaveBeenCalled()
        expect(fetchMyVotes).not.toHaveBeenCalled()
    })

    it("hides options linked to my own member", async () => {
        const cats = [category("c1", "Best Picture", [nominee("n-me", "Me", { member_ids: ["m-me"] }), nominee("n-bo", "Bo")]), twoCategories()[1]]
        await loaded(ballot({ categories: cats }))
        expect(screen.queryByRole("radio", { name: /me$/i })).toBeNull()
        expect(radio(BO)).toBeTruthy()
    })

    it("next unvoted scrolls to the first unvoted category", async () => {
        await loaded(undefined, { c1: "n-ann" })
        const scroll = vi.mocked(Element.prototype.scrollIntoView)
        fireEvent.click(nextUnvoted())
        expect(scroll).toHaveBeenCalledTimes(1)
        expect(scroll.mock.contexts[0]).toBe(section(C2))
    })

    it("typing an existing option votes for it without creating a nominee", async () => {
        await loaded(ballot({ categories: twoCategories({ allow_member_add: true }) }))
        const box = within(section(C1)).getByLabelText(/add an option/i)
        fireEvent.change(box, { target: { value: "  ann " } })
        fireEvent.submit(box.closest("form")!)
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-ann"))
        expect(addNominee).not.toHaveBeenCalled()
    })

    it("typing a new option creates a nominee, refreshes, then votes for it", async () => {
        const b = ballot({ categories: twoCategories({ allow_member_add: true }) })
        await loaded(b)
        vi.mocked(addNominee).mockResolvedValue("n-new")
        const box = within(section(C1)).getByLabelText(/add an option/i)
        fireEvent.change(box, { target: { value: " Zed " } })
        fireEvent.submit(box.closest("form")!)
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-new"))
        expect(addNominee).toHaveBeenCalledWith("c1", "Zed", [])
        expect(fetchBallotDetail).toHaveBeenCalledTimes(2)
    })

    it("group category: needs two members, then creates the group and votes for it", async () => {
        const cats = [category("c1", "Best Picture", [], { nominee_mode: "group" }), twoCategories()[1]]
        vi.mocked(fetchMembers).mockResolvedValue([{ id: "m-me", name: "Me", user_id: "u-me" }, ...MEMBERS.slice(0, 4)])
        vi.mocked(addNominee).mockResolvedValue("n-grp")
        await loaded(ballot({ categories: cats }))
        const sec = within(section(C1))
        const submit = await sec.findByRole("button", { name: /vote for this group/i })
        expect((submit as HTMLButtonElement).disabled).toBe(true)
        expect(sec.queryByLabelText("Me")).toBeNull() // never offered myself
        fireEvent.click(await sec.findByLabelText("Ann"))
        expect((submit as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(sec.getByLabelText("Bo"))
        expect((submit as HTMLButtonElement).disabled).toBe(false)
        fireEvent.click(submit)
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-grp"))
        expect(addNominee).toHaveBeenCalledWith("c1", "", ["m-Ann", "m-Bo"])
    })
})

describe("VotePage one-per-page flow", () => {
    it("Next moves to the next category and shows it", async () => {
        await loaded()
        expect(section(C1).className).not.toMatch(/\bhidden\b/)
        expect(section(C2).className).toMatch(/\bhidden\b/)
        fireEvent.click(screen.getByRole("button", { name: /next category/i }))
        expect(section(C1).className).toMatch(/\bhidden\b/)
        expect(section(C2).className).not.toMatch(/\bhidden\b/)
        fireEvent.click(screen.getByRole("button", { name: /previous category/i }))
        expect(section(C1).className).not.toMatch(/\bhidden\b/)
    })
    it("the chosen nominee shows a check and the same pebble edge in every category", async () => {
        await loaded(undefined, { c1: "n-ann" })
        expect(radio(ANN).className).toMatch(/border-pebble-/)
        expect(radio(ANN).querySelector("svg")).toBeTruthy()
        expect(radio(BO).querySelector("svg")).toBeNull()
    })
})
