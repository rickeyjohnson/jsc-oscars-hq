// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import ManageBallotsPage from "../../pages/committee/ManageBallotsPage"
import BallotAdminPage from "../../pages/committee/BallotAdminPage"
import MemberNamesPage from "../../pages/committee/MemberNamesPage"
import StatusChip from "../../components/committee/StatusChip"
import { Avatar } from "../Avatar"
import { ConfirmProvider } from "../ConfirmProvider"
import { fetchBallotDetail, fetchBallotSummaries, fetchRoundBallots, setBallotStatus } from "../../api/ballots"
import { countVotesBy, fetchCommitteeMemberIds, fetchMembers, resetMemberClaim } from "../../api/members"
import { fetchResults, recordResultsGuarded, updatePlaces, upsertResults } from "../../api/results"
import { fetchAllVotes } from "../../api/votes"
import type { BallotSummary } from "../../lib/voting"

vi.mock("../../api/ballots", () => ({ fetchBallotSummaries: vi.fn(), fetchBallotDetail: vi.fn(), setBallotStatus: vi.fn(), fetchRoundBallots: vi.fn(), createRoundBallot: vi.fn(), fetchCurrentSeason: vi.fn(), reopenBallot: vi.fn() }))
vi.mock("../../api/members", () => ({ fetchMembers: vi.fn(), countVotesBy: vi.fn(), resetMemberClaim: vi.fn(), fetchCommitteeMemberIds: vi.fn() }))
vi.mock("../../api/results", () => ({ fetchResults: vi.fn(), upsertResults: vi.fn(), updatePlaces: vi.fn(), recordResultsGuarded: vi.fn(), fetchReleaseStatus: vi.fn() }))
vi.mock("../../api/votes", () => ({ fetchAllVotes: vi.fn() }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ member: { user_id: "u-me" } }) }))

const DAY = 86_400_000
const ballot = (o: Partial<BallotSummary> = {}): BallotSummary => ({
    id: "b1", season_id: "S", parent_ballot_id: null, name: "Main Ballot", round: "main", status: "open",
    opens_at: new Date(Date.now() - DAY).toISOString(), closes_at: new Date(Date.now() + 3 * DAY).toISOString(),
    category_count: 1, my_vote_count: 0, ...o,
})
const detail = (o: Partial<BallotSummary> = {}) => ({
    ...ballot(o),
    categories: [{ id: "c1", name: "Best Locs", description: "", order: 1, nominee_mode: "everyone", allow_member_add: false, nominees: [
        { id: "n1", display_name: "Dakarai", type: "person", member_ids: [] },
        { id: "n2", display_name: "Langston", type: "person", member_ids: [] },
    ] }],
})
const vote = (voter: string, nominee: string) => ({ category_id: "c1", nominee_id: nominee, voter_id: voter, updated_at: "" })

const wrap = (ui: React.ReactNode, path = "/") => render(<MemoryRouter initialEntries={[path]}><ConfirmProvider>{ui}</ConfirmProvider></MemoryRouter>)

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(fetchBallotSummaries).mockReset()
    vi.mocked(fetchBallotDetail).mockReset()
    vi.mocked(setBallotStatus).mockReset()
    vi.mocked(fetchRoundBallots).mockReset().mockResolvedValue([])
    vi.mocked(fetchMembers).mockReset()
    vi.mocked(countVotesBy).mockReset()
    vi.mocked(resetMemberClaim).mockReset()
    vi.mocked(fetchCommitteeMemberIds).mockReset().mockResolvedValue(["u-me"])
    vi.mocked(fetchResults).mockReset().mockResolvedValue([])
    vi.mocked(upsertResults).mockReset()
    vi.mocked(recordResultsGuarded).mockReset().mockResolvedValue()
    vi.mocked(updatePlaces).mockReset().mockResolvedValue(0)
    vi.mocked(fetchAllVotes).mockReset().mockResolvedValue([])
})
afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe("Avatar pebble ring", () => {
    it("adds a 3px ring in the person's pebble with a gap", () => {
        render(<Avatar id="m-Micah" name="Micah" size={32} ring="pebble" />)
        const cls = screen.getByRole("img", { name: "Micah" }).className
        expect(cls).toContain("ring-[3px]")
        expect(cls).toMatch(/ring-pebble-/)
        expect(cls).toContain("ring-offset-bg")
    })
})

describe("StatusChip", () => {
    it("pairs an icon with a word", () => {
        const { container } = render(<StatusChip status="open" />)
        expect(container.textContent).toBe("open")
        expect(container.querySelector("svg")).toBeTruthy()
    })
})

describe("ManageBallotsPage", () => {
    it("shows a skeleton while loading", () => {
        vi.mocked(fetchBallotSummaries).mockReturnValue(new Promise(() => {}))
        wrap(<ManageBallotsPage />)
        expect(screen.getByRole("status", { name: "Loading ballots" })).toBeTruthy()
    })
    it("error shows a mapped message and retry reloads", async () => {
        vi.mocked(fetchBallotSummaries).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce([ballot()])
        wrap(<ManageBallotsPage />)
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("boom")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByText("Main Ballot")).toBeTruthy()
    })
    it("empty state", async () => {
        vi.mocked(fetchBallotSummaries).mockResolvedValue([])
        wrap(<ManageBallotsPage />)
        expect(await screen.findByText("No ballots yet")).toBeTruthy()
    })
    it("populated: grouped, rounds nested under the main ballot, one primary New ballot", async () => {
        vi.mocked(fetchBallotSummaries).mockResolvedValue([
            ballot({ id: "b1", name: "Main Ballot", status: "closed" }),
            ballot({ id: "b2", name: "Tie", round: "tiebreak", parent_ballot_id: "b1" }),
            ballot({ id: "b3", name: "Hot Takes" }),
            ballot({ id: "b4", name: "Fall Bonus", status: "draft" }),
        ])
        wrap(<ManageBallotsPage />)
        const link = (await screen.findByText("Main Ballot")).closest("a")!
        expect(link.getAttribute("href")).toBe("/app/profile/ballots/b1")
        expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Needs you", "Open", "Drafts"])
        const needs = screen.getByRole("region", { name: "Needs you" })
        expect(within(needs).getByText("Tie")).toBeTruthy()
        expect(screen.getByText("Next: check the rounds")).toBeTruthy()
        expect(screen.getByRole("link", { name: /New ballot/ }).getAttribute("href")).toBe("/app/profile/ballots/create")
        expect(screen.queryByRole("link", { name: /Reveal results/ })).toBeNull()
        expect(vi.mocked(fetchBallotSummaries)).toHaveBeenCalledWith(true)
    })
})

const renderAdmin = (path = "/app/profile/ballots/b1") =>
    wrap(<Routes><Route path="/app/profile/ballots/:ballotId" element={<BallotAdminPage />} /></Routes>, path)

describe("BallotAdminPage", () => {
    const members = [{ id: "m1", name: "Micah", user_id: "u1" }, { id: "m2", name: "Dee", user_id: null }]
    const prime = (o: Partial<BallotSummary> = {}, votes = [vote("u1", "n1")]) => {
        vi.mocked(fetchBallotSummaries).mockResolvedValue([ballot(o)])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail(o) as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue(votes)
    }
    it("skeleton, then error with retry", async () => {
        vi.mocked(fetchBallotSummaries).mockRejectedValueOnce(new Error("raw")).mockResolvedValue([ballot()])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail() as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        renderAdmin()
        expect(screen.getByRole("status", { name: "Loading ballot" })).toBeTruthy()
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("raw")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByText("Who voted")).toBeTruthy()
    })
    it("open ballot: one primary, who voted list, Close now is an outlined danger that opens a sheet naming who is left", async () => {
        prime()
        vi.mocked(setBallotStatus).mockResolvedValue()
        renderAdmin()
        expect(await screen.findByText("Who voted")).toBeTruthy()
        expect(screen.getByText("1 of 1")).toBeTruthy()
        expect(screen.getByText("not signed up")).toBeTruthy()
        expect(screen.getByRole("region", { name: "Next" }).textContent).toContain("Everyone has finished")
        // Export CSV lives only in Results
        expect(within(screen.getByRole("region", { name: "Results" })).getByRole("button", { name: /Export CSV/ })).toBeTruthy()
        expect(screen.getAllByRole("button", { name: /Export CSV/ })).toHaveLength(1)
        fireEvent.click(screen.getByRole("button", { name: "Close now" }))
        expect(setBallotStatus).not.toHaveBeenCalled()
        const dlg = await screen.findByRole("dialog")
        expect(dlg.textContent).toContain("1 of 1 have finished")
        fireEvent.click(within(dlg).getByRole("button", { name: "Close voting now" }))
        await waitFor(() => expect(setBallotStatus).toHaveBeenCalledWith("b1", "closed"))
    })
    it("a failed close shows a mapped alert", async () => {
        prime()
        vi.mocked(setBallotStatus).mockRejectedValue(new Error("rls denied"))
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close voting now" }))
        await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0))
        expect(screen.getAllByRole("alert").map((a) => a.textContent).join()).not.toContain("rls denied")
    })
    it("draft with blockers: Publish ballot is disabled and blockers listed", async () => {
        prime({ status: "draft" })
        vi.mocked(fetchBallotDetail).mockResolvedValue({ ...detail({ status: "draft" }), categories: [] } as never)
        renderAdmin()
        const publish = await screen.findByRole("button", { name: "Publish ballot" })
        expect((publish as HTMLButtonElement).disabled).toBe(true)
        expect(screen.getByText(/Add at least one category/)).toBeTruthy()
        expect(screen.queryByText("Who voted")).toBeNull()
    })
    it("closed ballot: results record automatically, no Record results button, Reopen is an outlined danger secondary", async () => {
        prime({ status: "closed" }, [vote("u1", "n1"), vote("u2", "n1"), vote("u3", "n2")])
        renderAdmin()
        await waitFor(() => expect(recordResultsGuarded).toHaveBeenCalledTimes(1))
        const writes = vi.mocked(recordResultsGuarded).mock.calls[0][0]
        expect(writes).toHaveLength(1)
        expect(writes[0].expected).toBeNull()
        expect(writes[0].row.winner_nominee_id).toBe("n1")
        expect(screen.queryByRole("button", { name: /Record results/ })).toBeNull()
        expect(await screen.findByRole("button", { name: "Reopen ballot" })).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Close now" })).toBeNull()
    })
    it("already recorded: nothing is written when opening a closed ballot", async () => {
        prime({ status: "closed" }, [vote("u1", "n1")])
        vi.mocked(fetchResults).mockResolvedValue([{ category_id: "c1", decided_ballot_id: "b1", winner_nominee_id: "n1", nominee_ids: ["n1", "n2"], top3_nominee_ids: ["n1"], decided_by: "votes", places: [] }] as never)
        renderAdmin()
        expect(await screen.findByText("1 of 1 winners")).toBeTruthy()
        expect(recordResultsGuarded).not.toHaveBeenCalled()
    })
    it("closing records as part of it", async () => {
        const open = ballot({})
        vi.mocked(fetchBallotSummaries).mockResolvedValueOnce([open]).mockResolvedValue([{ ...open, status: "closed" }])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail() as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue([vote("u1", "n1")])
        vi.mocked(setBallotStatus).mockResolvedValue()
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close voting now" }))
        await waitFor(() => expect(setBallotStatus).toHaveBeenCalledWith("b1", "closed"))
        await waitFor(() => expect(recordResultsGuarded).toHaveBeenCalled())
    })
    it("a failed refresh after closing keeps the page and offers Retry (P1-15)", async () => {
        const open = ballot({})
        vi.mocked(fetchBallotSummaries).mockResolvedValueOnce([open]).mockRejectedValueOnce(new Error("offline")).mockResolvedValue([{ ...open, status: "closed" }])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail() as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue([vote("u1", "n1")])
        vi.mocked(setBallotStatus).mockResolvedValue()
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close voting now" }))
        expect(await screen.findByText(/Couldn't refresh/)).toBeTruthy()
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(screen.getByText("Who voted")).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: "Retry" }))
        await waitFor(() => expect(screen.queryByText(/Couldn't refresh/)).toBeNull())
    })
    it("a record failure after closing is its own message and the sheet closes (P1-15)", async () => {
        const open = ballot({})
        vi.mocked(fetchBallotSummaries).mockResolvedValueOnce([open]).mockResolvedValue([{ ...open, status: "closed" }])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail() as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue([vote("u1", "n1")])
        vi.mocked(setBallotStatus).mockResolvedValue()
        vi.mocked(recordResultsGuarded).mockRejectedValue(new Error("rls"))
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Close voting now" }))
        expect(await screen.findByText("Couldn't record the results")).toBeTruthy()
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(screen.queryByText(/Couldn't update the ballot/)).toBeNull()
    })
    it("committee round: enter the winner with a confirm naming the category and winner", async () => {
        const main = ballot({ id: "b1", status: "closed" })
        const cm = ballot({ id: "b3", round: "committee", parent_ballot_id: "b1", name: "Committee" })
        vi.mocked(fetchBallotSummaries).mockResolvedValue([main, cm])
        vi.mocked(fetchBallotDetail).mockImplementation(async (id: string) => (id === "b3" ? detail({ id: "b3", round: "committee", parent_ballot_id: "b1" }) : detail({ status: "closed" })) as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue([])
        vi.mocked(fetchResults).mockResolvedValue([{ category_id: "c1", decided_ballot_id: "b1", winner_nominee_id: null, nominee_ids: ["n1", "n2"], top3_nominee_ids: [], decided_by: null, places: [] }] as never)
        vi.mocked(upsertResults).mockResolvedValue()
        renderAdmin("/app/profile/ballots/b3")
        expect(await screen.findByText("0 of 1 category decided")).toBeTruthy()
        expect(screen.queryByText("Who voted")).toBeNull()
        fireEvent.click(await screen.findByRole("radio", { name: /Dakarai/ }))
        fireEvent.click(screen.getByRole("button", { name: /Save winner for Best Locs/ }))
        const dlg = await screen.findByRole("alertdialog")
        expect(dlg.textContent).toContain("Save Dakarai as the Best Locs winner?")
        fireEvent.click(within(dlg).getByRole("button", { name: "Save winner" }))
        await waitFor(() => expect(upsertResults).toHaveBeenCalled())
        const row = vi.mocked(upsertResults).mock.calls[0][0][0]
        expect(row.winner_nominee_id).toBe("n1")
        expect(row.decided_ballot_id).toBe("b3")
        expect(row.decided_by).toBe("manual")
    })
})

describe("MemberNamesPage", () => {
    const members = [
        { id: "m1", name: "Micah", user_id: "u1" },
        { id: "m2", name: "Dee", user_id: null },
        { id: "m3", name: "Rickey", user_id: "u-me" },
    ]
    it("loading skeleton, then rows with chips; own name has no Reset", async () => {
        vi.mocked(fetchMembers).mockResolvedValue(members)
        wrap(<MemberNamesPage />)
        expect(screen.getByRole("status", { name: "Loading members" })).toBeTruthy()
        expect(await screen.findByText("Micah")).toBeTruthy()
        expect(screen.getByText("3 names · 2 signed up")).toBeTruthy()
        expect(screen.getByText("Rickey").closest("li")!.textContent).toContain("You")
        expect(screen.getByRole("button", { name: "Reset Micah" })).toBeTruthy()
        expect(screen.queryByRole("button", { name: "Reset Rickey" })).toBeNull()
        expect(screen.queryByRole("button", { name: "Reset Dee" })).toBeNull()
    })
    it("load error shows a mapped alert and retries", async () => {
        vi.mocked(fetchMembers).mockRejectedValueOnce(new Error("raw")).mockResolvedValueOnce(members)
        wrap(<MemberNamesPage />)
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("raw")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByText("Micah")).toBeTruthy()
    })
    it("reset: shows the vote count, Reset claim waits for it, cancel closes", async () => {
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(countVotesBy).mockResolvedValue(31)
        wrap(<MemberNamesPage />)
        fireEvent.click(await screen.findByRole("button", { name: "Reset Micah" }))
        const grp = await screen.findByRole("group", { name: "Reset Micah" })
        expect(await within(grp).findByText(/deletes Micah's 31 votes/)).toBeTruthy()
        fireEvent.click(within(grp).getByRole("button", { name: "Cancel" }))
        expect(screen.queryByRole("group", { name: "Reset Micah" })).toBeNull()
        expect(resetMemberClaim).not.toHaveBeenCalled()
    })
    it("reset claim calls the api with the expected user, then refreshes with a notice", async () => {
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(countVotesBy).mockResolvedValue(2)
        vi.mocked(resetMemberClaim).mockResolvedValue()
        wrap(<MemberNamesPage />)
        fireEvent.click(await screen.findByRole("button", { name: "Reset Micah" }))
        const grp = await screen.findByRole("group", { name: "Reset Micah" })
        await within(grp).findByText(/deletes Micah's 2 votes/)
        fireEvent.click(within(grp).getByRole("button", { name: "Reset claim" }))
        await waitFor(() => expect(resetMemberClaim).toHaveBeenCalledWith("Micah", "u1"))
        expect((await screen.findByRole("status")).textContent).toContain("Micah can sign up again")
    })
    it("a stale-claim error keeps its own guidance; other errors are mapped", async () => {
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(countVotesBy).mockResolvedValue(1)
        vi.mocked(resetMemberClaim).mockRejectedValueOnce(new Error("This name was changed by someone else — refresh the list.")).mockRejectedValueOnce(new Error("pg 500"))
        wrap(<MemberNamesPage />)
        fireEvent.click(await screen.findByRole("button", { name: "Reset Micah" }))
        const grp = await screen.findByRole("group", { name: "Reset Micah" })
        await within(grp).findByText(/deletes Micah's 1 vote/)
        fireEvent.click(within(grp).getByRole("button", { name: "Reset claim" }))
        expect((await within(grp).findByRole("alert")).textContent).toContain("changed by someone else")
        fireEvent.click(within(grp).getByRole("button", { name: "Reset claim" }))
        await waitFor(() => expect(within(grp).getByRole("alert").textContent).not.toContain("changed by someone else"))
        expect(within(grp).getByRole("alert").textContent).not.toContain("pg 500")
    })
})
