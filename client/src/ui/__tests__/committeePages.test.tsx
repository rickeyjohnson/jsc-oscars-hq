// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import ManageBallotsPage from "../../pages/committee/ManageBallotsPage"
import BallotAdminPage from "../../pages/committee/BallotAdminPage"
import MemberNamesPage from "../../pages/committee/MemberNamesPage"
import TallyPanel from "../../components/committee/TallyPanel"
import StatusChip from "../../components/committee/StatusChip"
import { Avatar } from "../Avatar"
import { ConfirmProvider } from "../ConfirmProvider"
import { fetchBallotDetail, fetchBallotSummaries, fetchRoundBallots, setBallotStatus } from "../../api/ballots"
import { countVotesBy, fetchCommitteeMemberIds, fetchMembers, resetMemberClaim } from "../../api/members"
import { fetchResults, upsertResults } from "../../api/results"
import { fetchAllVotes } from "../../api/votes"
import type { BallotSummary } from "../../lib/voting"

vi.mock("../../api/ballots", () => ({ fetchBallotSummaries: vi.fn(), fetchBallotDetail: vi.fn(), setBallotStatus: vi.fn(), fetchRoundBallots: vi.fn(), createRoundBallot: vi.fn() }))
vi.mock("../../api/members", () => ({ fetchMembers: vi.fn(), countVotesBy: vi.fn(), resetMemberClaim: vi.fn(), fetchCommitteeMemberIds: vi.fn() }))
vi.mock("../../api/results", () => ({ fetchResults: vi.fn(), upsertResults: vi.fn(), updatePlaces: vi.fn() }))
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
    it("populated: rows link to the control page, with actions", async () => {
        vi.mocked(fetchBallotSummaries).mockResolvedValue([ballot(), ballot({ id: "b2", name: "Tie", round: "tiebreak", status: "draft" })])
        wrap(<ManageBallotsPage />)
        const link = (await screen.findByText("Main Ballot")).closest("a")!
        expect(link.getAttribute("href")).toBe("/app/profile/ballots/b1")
        expect(screen.getByText("tiebreak")).toBeTruthy()
        expect(screen.getByRole("link", { name: /New ballot/ }).getAttribute("href")).toBe("/app/profile/ballots/create")
        expect(screen.getByRole("link", { name: /Reveal results/ }).getAttribute("href")).toBe("/app/profile/release")
        expect(vi.mocked(fetchBallotSummaries)).toHaveBeenCalledWith(true)
    })
})

const renderAdmin = () =>
    wrap(<Routes><Route path="/app/profile/ballots/:ballotId" element={<BallotAdminPage />} /></Routes>, "/app/profile/ballots/b1")

describe("BallotAdminPage", () => {
    const members = [{ id: "m1", name: "Micah", user_id: "u1" }, { id: "m2", name: "Dee", user_id: null }]
    const prime = (o: Partial<BallotSummary> = {}) => {
        vi.mocked(fetchBallotSummaries).mockResolvedValue([ballot(o)])
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail(o) as never)
        vi.mocked(fetchMembers).mockResolvedValue(members)
        vi.mocked(fetchAllVotes).mockResolvedValue([vote("u1", "n1")])
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
        expect(await screen.findByText("Who has voted")).toBeTruthy()
    })
    it("open ballot: completion rows, Close now goes through the confirm sheet", async () => {
        prime()
        vi.mocked(setBallotStatus).mockResolvedValue()
        renderAdmin()
        expect(await screen.findByText("Who has voted")).toBeTruthy()
        expect(screen.getByText("1 of 1")).toBeTruthy()
        expect(screen.getByText("not signed up")).toBeTruthy()
        expect(screen.getByRole("button", { name: /Export CSV/ })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Close now" }))
        expect(setBallotStatus).not.toHaveBeenCalled()
        const dlg = await screen.findByRole("alertdialog")
        fireEvent.click(within(dlg).getByRole("button", { name: "Close voting" }))
        await waitFor(() => expect(setBallotStatus).toHaveBeenCalledWith("b1", "closed"))
    })
    it("cancelling the confirm does nothing", async () => {
        prime()
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        const dlg = await screen.findByRole("alertdialog")
        fireEvent.click(within(dlg).getByRole("button", { name: "Cancel" }))
        await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
        expect(setBallotStatus).not.toHaveBeenCalled()
    })
    it("a failed status change shows a mapped alert", async () => {
        prime()
        vi.mocked(setBallotStatus).mockRejectedValue(new Error("rls denied"))
        renderAdmin()
        fireEvent.click(await screen.findByRole("button", { name: "Close now" }))
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Close voting" }))
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("rls denied")
    })
    it("draft with blockers: Publish is disabled and blockers listed", async () => {
        prime({ status: "draft" })
        vi.mocked(fetchBallotDetail).mockResolvedValue({ ...detail({ status: "draft" }), categories: [] } as never)
        renderAdmin()
        const publish = await screen.findByRole("button", { name: "Publish" })
        expect((publish as HTMLButtonElement).disabled).toBe(true)
    })
})

describe("TallyPanel", () => {
    it("closed ballot: summary blocks, ranked table with headers, Record results", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(detail({ status: "closed" }) as never)
        vi.mocked(fetchAllVotes).mockResolvedValue([vote("u1", "n1"), vote("u2", "n1"), vote("u3", "n2")])
        vi.mocked(upsertResults).mockResolvedValue()
        wrap(<TallyPanel ballot={ballot({ status: "closed" })} />)
        expect(await screen.findByRole("heading", { name: /Best Locs/ })).toBeTruthy()
        expect(screen.getByText("decided")).toBeTruthy()
        expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Rank", "Nominee", "Votes"])
        expect(screen.getAllByRole("columnheader")[0].getAttribute("scope")).toBe("col")
        expect(screen.getByText("Dakarai")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Record results" }))
        await waitFor(() => expect(upsertResults).toHaveBeenCalled())
        expect(await screen.findByRole("status")).toBeTruthy()
    })
    it("not ended: waiting copy; load error: retry", async () => {
        const { unmount } = wrap(<TallyPanel ballot={ballot()} />)
        expect(screen.getByText(/appear here once voting closes/)).toBeTruthy()
        unmount()
        vi.mocked(fetchBallotDetail).mockRejectedValueOnce(new Error("raw")).mockResolvedValue(detail({ status: "closed" }) as never)
        wrap(<TallyPanel ballot={ballot({ status: "closed" })} />)
        const alert = await screen.findByRole("alert")
        expect(alert.textContent).not.toContain("raw")
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByText("Dakarai")).toBeTruthy()
    })
    it("shows a loading skeleton first", () => {
        vi.mocked(fetchBallotDetail).mockReturnValue(new Promise(() => {}))
        wrap(<TallyPanel ballot={ballot({ status: "closed" })} />)
        expect(screen.getByRole("status", { name: "Loading tally" })).toBeTruthy()
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
