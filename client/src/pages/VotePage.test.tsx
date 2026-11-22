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
const clearButton = (_cat: RegExp) => screen.getByRole("button", { name: /clear my vote/i })
const openJump = () => fireEvent.click(screen.getByRole("button", { name: /^jump to/i }))
const goFirstUnvoted = () => {
    openJump()
    fireEvent.click(screen.getByRole("button", { name: /go to first unvoted/i }))
}
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
        expect(within(section(C1)).getByText(/saved/i)).toBeTruthy()
        expect(screen.getByText(/1 of 2 voted/i)).toBeTruthy()
    })

    it("saving shows a spinner on the card and never disables footer nav (P1-2)", async () => {
        await loaded()
        const d = deferred()
        vi.mocked(castVote).mockReturnValueOnce(d.promise)
        fireEvent.click(radio(ANN))
        await waitFor(() => expect(radio(ANN).getAttribute("aria-busy")).toBe("true"))
        expect(radio(ANN).querySelector(".animate-spin")).toBeTruthy()
        expect((screen.getByRole("button", { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(false)
        d.resolve()
        await waitFor(() => expect(radio(ANN).getAttribute("aria-busy")).toBeNull())
        expect((screen.getByRole("button", { name: /^next$/i }) as HTMLButtonElement).disabled).toBe(false)
        expect(radio(ANN).getAttribute("aria-busy")).toBeNull()
        expect(within(section(C1)).getByText(/your vote is saved/i)).toBeTruthy()
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

    it("a save that fails after jumping away is flagged on the category you are viewing", async () => {
        await loaded()
        const d = deferred()
        vi.mocked(castVote).mockReturnValueOnce(d.promise)
        fireEvent.click(radio(ANN))
        await waitFor(() => expect(castVote).toHaveBeenCalled())
        fireEvent.click(screen.getByRole("button", { name: /^jump to/i }))
        fireEvent.click(screen.getByRole("button", { name: /best dressed/i }))
        expect(section(C2).className).not.toMatch(/\bhidden\b/)
        d.reject(new Error("nope"))
        const note = await screen.findByText(/couldn't save your vote in best picture/i)
        expect(note.closest("[role=alert]")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /go to it/i }))
        expect(section(C1).className).not.toMatch(/\bhidden\b/)
        expect(within(section(C1)).getByRole("button", { name: /try again/i })).toBeTruthy()
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
        for (const r of screen.getAllByRole("radio")) expect(r.getAttribute("aria-disabled")).toBe("true")
        expect(screen.getByRole("status").textContent).toMatch(/voting closed at|voting is closed/i)
        expect(screen.getAllByRole("link", { name: /back to ballots/i }).length).toBeGreaterThan(0)
        expect(screen.queryByRole("button", { name: /^(back|skip|next)$/i })).toBeNull()
        fireEvent.click(radio(ANN))
        expect(castVote).not.toHaveBeenCalled()
    })

    it("a window that closes mid-session turns read-only without a tap", async () => {
        await loaded(ballot({ closes_at: new Date(Date.now() + 400).toISOString(), categories: twoCategories() }))
        expect(radio(ANN).getAttribute("aria-disabled")).toBeNull()
        await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/voting closed at/i), { timeout: 1500 })
        expect(screen.getAllByRole("link", { name: /back to ballots/i }).length).toBeGreaterThan(0)
        fireEvent.click(radio(ANN))
        expect(castVote).not.toHaveBeenCalled()
    })

    it("refetches the ballot on focus and goes read-only when it was closed by hand", async () => {
        await loaded()
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ status: "closed", categories: twoCategories() }))
        vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 60_000 })
        try {
            fireEvent(window, new Event("focus"))
        } finally {
            vi.useRealTimers()
        }
        await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/voting is closed/i))
    })

    it("upcoming ballot says when it opens", async () => {
        const opens = new Date(Date.now() + 86_400_000)
        await loaded(ballot({ opens_at: opens.toISOString(), closes_at: new Date(Date.now() + 3 * 86_400_000).toISOString(), categories: twoCategories() }))
        expect(screen.getByRole("status").textContent).toBe(opensAtLabel(opens))
        for (const r of screen.getAllByRole("radio")) expect(r.getAttribute("aria-disabled")).toBe("true")
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

    it("Go to first unvoted scrolls to the first unvoted category", async () => {
        await loaded(undefined, { c1: "n-ann" })
        const scroll = vi.mocked(Element.prototype.scrollIntoView)
        goFirstUnvoted()
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

    it("typing an existing option says it already exists", async () => {
        await loaded(ballot({ categories: twoCategories({ allow_member_add: true }) }))
        const box = within(section(C1)).getByLabelText(/add an option/i)
        fireEvent.change(box, { target: { value: "ann" } })
        fireEvent.submit(box.closest("form")!)
        expect(await within(section(C1)).findByText(/option already exists/i)).toBeTruthy()
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
        fireEvent.click(await sec.findByRole("button", { name: /add a group/i }))
        const submit = await screen.findByRole("button", { name: /pick 2 or 3 people/i })
        expect((submit as HTMLButtonElement).disabled).toBe(true)
        expect(screen.queryByRole("button", { name: /^me$/i })).toBeNull() // never offered myself
        fireEvent.click(await screen.findByRole("button", { name: "Ann" }))
        expect((screen.getByRole("button", { name: /pick 2 or 3 people/i }) as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(screen.getByRole("button", { name: "Bo" }))
        const go = screen.getByRole("button", { name: "Vote for Ann & Bo" })
        expect((go as HTMLButtonElement).disabled).toBe(false)
        fireEvent.click(go)
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-grp"))
        expect(addNominee).toHaveBeenCalledWith("c1", "", ["m-Ann", "m-Bo"])
    })
})

describe("VotePage one-per-page flow", () => {
    it("shows Category N of M and a Jump to... link", async () => {
        await loaded()
        expect(screen.getByText("Category 1 of 2")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /^jump to/i }))
        expect(screen.getByRole("button", { name: /go to first unvoted/i })).toBeTruthy()
    })
    it("jump sheet marks the current row and flags unvoted ones", async () => {
        await loaded(undefined, { c1: "n-ann" })
        fireEvent.click(screen.getByRole("button", { name: /^jump to/i }))
        const here = screen.getByRole("button", { name: /best picture/i })
        expect(here.getAttribute("aria-current")).toBe("true")
        expect(here.textContent).toMatch(/Voted \(here\)/)
        expect(here.querySelector("svg")).toBeNull()
        const other = screen.getByRole("button", { name: /best dressed/i })
        expect(other.getAttribute("aria-current")).toBeNull()
        expect(other.textContent).toMatch(/Not voted/)
    })
    it("radiogroup: one tab stop, arrows move focus without voting, click votes once", async () => {
        await loaded()
        const ann = radio(ANN)
        const bo = radio(BO)
        expect(ann.tabIndex).toBe(0)
        expect(bo.tabIndex).toBe(-1)
        ann.focus()
        fireEvent.keyDown(ann, { key: "ArrowDown" })
        expect(document.activeElement).toBe(bo)
        fireEvent.keyDown(bo, { key: "ArrowDown" })
        expect(document.activeElement).toBe(ann) // wraps
        fireEvent.keyDown(ann, { key: "ArrowUp" })
        expect(document.activeElement).toBe(bo)
        expect(castVote).not.toHaveBeenCalled()
        fireEvent.click(bo) // Enter/Space on a button dispatches click
        await waitFor(() => expect(castVote).toHaveBeenCalledTimes(1))
        expect(castVote).toHaveBeenCalledWith("B1", "c1", "n-bo")
    })
    it("the selected radio is the tab stop", async () => {
        await loaded(undefined, { c1: "n-bo" })
        expect(radio(BO).tabIndex).toBe(0)
        expect(radio(ANN).tabIndex).toBe(-1)
    })
    it("focus moves to Try again on a new error when focus was in that category", async () => {
        await loaded()
        vi.mocked(castVote).mockRejectedValueOnce(new TypeError("Failed to fetch"))
        radio(ANN).focus()
        fireEvent.click(radio(ANN))
        const alert = await within(section(C1)).findByRole("alert")
        await waitFor(() => expect(document.activeElement).toBe(within(alert).getByRole("button", { name: /try again/i })))
    })
    it("Skip moves to the next category and shows it; Back returns", async () => {
        await loaded()
        expect(section(C1).className).not.toMatch(/\bhidden\b/)
        expect(section(C2).className).toMatch(/\bhidden\b/)
        fireEvent.click(screen.getByRole("button", { name: /^skip$/i }))
        expect(section(C1).className).toMatch(/\bhidden\b/)
        expect(section(C2).className).not.toMatch(/\bhidden\b/)
        fireEvent.click(screen.getByRole("button", { name: /^back$/i }))
        expect(section(C1).className).not.toMatch(/\bhidden\b/)
    })
    it("the chosen nominee fills with its pebble, shows a check, and has no left edge", async () => {
        await loaded(undefined, { c1: "n-ann" })
        expect(radio(ANN).className).toMatch(/bg-pebble-/)
        expect(radio(ANN).className).not.toMatch(/border-l|border-pebble-/)
        expect(radio(BO).className).not.toMatch(/border-l|border-pebble-/)
        expect(radio(ANN).querySelector("svg")).toBeTruthy()
        // fill only: the face has no ring or offset halo, and turns ink
        const face = radio(ANN).querySelector("span")!.className
        expect(face).not.toMatch(/ring-offset-bg|ring-\[3px\]|border-/)
        expect(face).toMatch(/bg-on-pebble-/)
        expect(radio(BO).querySelector("span")!.className).toMatch(/ring-\[3px\]/)
        expect(radio(BO).querySelector("svg")).toBeNull()
    })

    it("Next label is Skip until voted, then Next, then Review on the last category", async () => {
        await loaded(undefined, { c1: "n-ann" })
        expect(screen.getByRole("button", { name: /^next$/i })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /^next$/i }))
        expect(screen.getByRole("button", { name: /^review$/i })).toBeTruthy()
    })
})

describe("VotePage review step", () => {
    it("lists picks, flags skipped categories, and Finish voting goes to submit", async () => {
        await loaded(undefined, { c1: "n-ann" })
        fireEvent.click(screen.getByRole("button", { name: /^next$/i }))
        fireEvent.click(screen.getByRole("button", { name: /^review$/i }))
        const rev = screen.getByRole("region", { name: /review your votes/i })
        expect(within(rev).getByText("Ann")).toBeTruthy()
        expect(within(rev).getByText(/1 not voted yet/i)).toBeTruthy()
        expect(screen.getByRole("link", { name: /finish voting/i }).getAttribute("href")).toBe("/app/ballots/B1/submit")
        expect(within(rev).queryByRole("link", { name: /finish voting/i })).toBeNull() // lives in the footer
        expect(screen.queryByText(/category \d of \d/i)).toBeNull()
        expect(screen.queryByRole("button", { name: /voted\. jump to a category|^category \d/i })).toBeNull() // no strip
        expect(within(rev).getByRole("button", { name: /vote in best dressed/i }).className).toMatch(/pebble-lemon/)
        fireEvent.click(screen.getByRole("button", { name: /‹ back/i }))
        expect(screen.queryByRole("region", { name: /review your votes/i })).toBeNull()
        expect(section(C2).className).not.toMatch(/\bhidden\b/)
        fireEvent.click(screen.getByRole("button", { name: /^review$/i }))
        fireEvent.click(screen.getByRole("button", { name: /vote in best dressed/i }))
        expect(section(C2).className).not.toMatch(/\bhidden\b/)
        expect(screen.queryByRole("region", { name: /review your votes/i })).toBeNull()
    })
})

describe("VotePage group category", () => {
    const grp = (id: string, name: string, ids: string[]) => nominee(id, name, { type: "group", member_ids: ids })
    const groupCats = () => [
        category("c1", "Best Picture", [grp("g1", "Ann & Bo", ["m-Ann", "m-Bo"]), grp("g2", "Me & Cy", ["m-me", "m-Cy"]), grp("g3", "Cy & Di", ["m-Cy", "m-Di"])], { nominee_mode: "group" }),
        twoCategories()[1],
    ]
    beforeEach(() => {
        vi.mocked(fetchMembers).mockResolvedValue([{ id: "m-me", name: "Me", user_id: "u-me" }, ...MEMBERS.slice(0, 4)])
    })

    it("shows groups I'm in locked with an explanation, never as a radio", async () => {
        await loaded(ballot({ categories: groupCats() }))
        expect(within(section(C1)).getAllByRole("radio")).toHaveLength(2) // Ann & Bo, Cy & Di only
        expect(screen.queryByRole("radio", { name: /me & cy/i })).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: /me & cy, locked/i }))
        expect(await screen.findByText(/you can't vote for yourself or a group you belong to/i)).toBeTruthy()
        expect(castVote).not.toHaveBeenCalled()
    })

    it("non-member options take pebbles in list order", async () => {
        await loaded(ballot({ categories: groupCats() }))
        const r = within(section(C1)).getAllByRole("radio")
        expect(r[0].querySelector("span")?.className).toMatch(/pebble-strawberry/)
        expect(r[1].querySelector("span")?.className).toMatch(/pebble-cherry/)
    })

    it("a group of people that already exists is selected, not duplicated", async () => {
        await loaded(ballot({ categories: groupCats() }))
        fireEvent.click(within(section(C1)).getByRole("button", { name: /add a group/i }))
        fireEvent.click(await screen.findByRole("button", { name: "Ann" }))
        fireEvent.click(screen.getByRole("button", { name: "Bo" }))
        fireEvent.click(screen.getByRole("button", { name: "Vote for Ann & Bo" }))
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "g1"))
        expect(addNominee).not.toHaveBeenCalled()
        const info = await within(section(C1)).findByText(/already exists/i)
        expect(info.closest("[role=status]")!.className).toMatch(/border-pebble-sky/)
    })

    it("a failed save for an existing group shows the error, not the duplicate notice", async () => {
        await loaded(ballot({ categories: groupCats() }))
        vi.mocked(castVote).mockRejectedValueOnce(new Error("nope"))
        fireEvent.click(within(section(C1)).getByRole("button", { name: /add a group/i }))
        fireEvent.click(await screen.findByRole("button", { name: "Ann" }))
        fireEvent.click(screen.getByRole("button", { name: "Bo" }))
        fireEvent.click(screen.getByRole("button", { name: "Vote for Ann & Bo" }))
        expect(await within(section(C1)).findByRole("alert")).toBeTruthy()
        expect(within(section(C1)).queryByText(/already exists/i)).toBeNull()
    })

    it("the server returning an existing group id shows the duplicate notice", async () => {
        await loaded(ballot({ categories: groupCats() }))
        vi.mocked(addNominee).mockResolvedValue("g3") // client set differs, server dedupes to Cy & Di
        fireEvent.click(within(section(C1)).getByRole("button", { name: /add a group/i }))
        fireEvent.click(await screen.findByRole("button", { name: "Di" }))
        fireEvent.click(screen.getByRole("button", { name: "Bo" }))
        fireEvent.click(screen.getByRole("button", { name: "Vote for Bo & Di" }))
        await waitFor(() => expect(castVote).toHaveBeenCalledWith("B1", "c1", "g3"))
        expect(await within(section(C1)).findByText(/already exists/i)).toBeTruthy()
    })

    it("group sheet shows a live preview and a one-more hint", async () => {
        await loaded(ballot({ categories: groupCats() }))
        fireEvent.click(within(section(C1)).getByRole("button", { name: /add a group/i }))
        expect(screen.queryByTestId("group-preview")).toBeNull()
        fireEvent.click(await screen.findByRole("button", { name: "Cy" }))
        expect(screen.getByText(/pick one more person/i)).toBeTruthy()
        expect((screen.getByRole("button", { name: /pick 2 or 3 people/i }) as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(screen.getByRole("button", { name: "Ann" }))
        const preview = screen.getByTestId("group-preview")
        expect(within(preview).getByText("Ann & Cy")).toBeTruthy()
        expect(within(preview).getByText("2 people")).toBeTruthy()
        expect(screen.queryByText(/pick one more person/i)).toBeNull()
        expect(screen.getByRole("button", { name: "Ann" }).querySelector("svg")).toBeTruthy()
    })

    it("the footer Add a group button (desktop) opens the same sheet", async () => {
        await loaded(ballot({ categories: groupCats() }))
        const footer = screen.getAllByRole("button", { name: /add a group/i }).find((b) => !section(C1).contains(b))!
        fireEvent.click(footer)
        expect(await screen.findByRole("button", { name: /pick 2 or 3 people/i })).toBeTruthy()
    })

    it("caps a group at three people", async () => {
        await loaded(ballot({ categories: groupCats() }))
        fireEvent.click(within(section(C1)).getByRole("button", { name: /add a group/i }))
        for (const n of ["Ann", "Bo", "Cy"]) fireEvent.click(await screen.findByRole("button", { name: n }))
        expect((screen.getByRole("button", { name: "Di" }) as HTMLButtonElement).disabled).toBe(true)
    })
})

describe("VotePage save failures", () => {
    it("network failure offers Try again, which saves", async () => {
        await loaded()
        vi.mocked(castVote).mockRejectedValueOnce(new TypeError("Failed to fetch"))
        fireEvent.click(radio(ANN))
        const alert = await within(section(C1)).findByRole("alert")
        expect(alert.textContent).toMatch(/check your connection/i)
        expect(alert.className).toMatch(/border-pebble-cherry/)
        expect(within(alert).getByRole("button", { name: /try again/i }).className).toMatch(/bg-inverse/)
        fireEvent.click(within(alert).getByRole("button", { name: /try again/i }))
        await waitFor(() => expect(castVote).toHaveBeenCalledTimes(2))
        await waitFor(() => expect(within(section(C1)).queryByRole("alert")).toBeNull())
    })

    it("RLS denial on a ballot the committee closed by hand reads as closed, not self-vote", async () => {
        await loaded()
        vi.mocked(castVote).mockRejectedValueOnce({ code: "42501", message: "new row violates row-level security" })
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ status: "closed", categories: twoCategories() }))
        fireEvent.click(radio(ANN))
        const note = await within(section(C1)).findByRole("status")
        expect(note.textContent).toMatch(/voting closed at/i)
        expect(section(C1).textContent).not.toMatch(/group you're in/i)
        expect(within(note).queryByRole("button", { name: /try again/i })).toBeNull()
    })

    it("RLS denial on an open ballot still says you can't vote for yourself", async () => {
        await loaded()
        vi.mocked(castVote).mockRejectedValueOnce({ code: "42501", message: "violates row-level security" })
        fireEvent.click(radio(ANN))
        const alert = await within(section(C1)).findByRole("alert")
        expect(alert.textContent).toMatch(/yourself/i)
    })

    it("an add_nominee server rule shows its own message with no retry", async () => {
        await loaded(ballot({ categories: twoCategories({ allow_member_add: true }) }))
        vi.mocked(addNominee).mockRejectedValueOnce({ message: "a different nominee with this name already exists" })
        const box = within(section(C1)).getByLabelText(/add an option/i)
        fireEvent.change(box, { target: { value: "Zed" } })
        fireEvent.submit(box.closest("form")!)
        const alert = await within(section(C1)).findByRole("alert")
        expect(alert.textContent).toMatch(/already taken/i)
        expect(within(alert).queryByRole("button", { name: /try again/i })).toBeNull()
    })

    it("closed window says so, with no retry", async () => {
        await loaded()
        vi.mocked(castVote).mockImplementationOnce(async () => {
            throw new Error("denied")
        })
        const b = vi.mocked(fetchBallotDetail)
        b.mockResolvedValue(ballot({ closes_at: new Date(Date.now() - 1000).toISOString(), categories: twoCategories() }))
        // the page already holds the open ballot; closing time is read from it, so fake the clock instead
        vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 86_400_000 })
        try {
            fireEvent.click(radio(ANN))
            const alert = await within(section(C1)).findByRole("status")
            expect(alert.textContent).toMatch(/voting closed at/i)
            expect(within(alert).queryByRole("button", { name: /try again/i })).toBeNull()
        } finally {
            vi.useRealTimers()
        }
    })
})
