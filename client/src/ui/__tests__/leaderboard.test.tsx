// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { STAT_MEMBERS, STAT_ROWS } from "../../test/statsFixture"
import { buildModel } from "../../lib/statsLab"

const api = vi.hoisted(() => ({ fetchPastStats: vi.fn(), fetchMembers: vi.fn(), fetchMemberDirectory: vi.fn(), fetchCurrentSeason: vi.fn(), fetchSeasonResults: vi.fn() }))
vi.mock("../../api/pastStats", () => ({ fetchPastStats: api.fetchPastStats, PAST_STATS_UNAVAILABLE: "Previous stats aren't available yet" }))
vi.mock("../../api/members", () => ({ fetchMembers: api.fetchMembers, fetchMemberDirectory: api.fetchMemberDirectory }))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: api.fetchCurrentSeason }))
vi.mock("../../api/results", () => ({ fetchSeasonResults: api.fetchSeasonResults }))
let who = "m-Rickey"
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ profile: { is_committee: false }, member: { id: who, name: who.slice(2) }, loading: false }) }))

import { Leaderboard } from "../../pages/results/Leaderboard"
import { LeaderboardPane } from "../../pages/results/LeaderboardPane"
import MemberStatsPage from "../../pages/MemberStatsPage"

const model = buildModel({ rows: STAT_ROWS, members: STAT_MEMBERS })
const Loc = () => <span data-testid="loc">{useLocation().pathname}</span>
const view = (el = <Leaderboard model={model} pendingLabel="Fall 2026" viewerId="m-Rickey" />) => render(<MemoryRouter><Loc />{el}</MemoryRouter>)
const podium = () => within(screen.getByRole("region", { name: /^Podium/ })).getAllByRole("listitem")
const rows = () => within(screen.getByRole("region", { name: /^Leaderboard,/ })).getAllByRole("listitem")
const press = (group: string, label: string) => fireEvent.click(within(screen.getByRole("group", { name: group })).getByRole("button", { name: label }))

beforeEach(() => {
    who = "m-Rickey"
    Object.values(api).forEach((f) => f.mockReset())
    api.fetchMembers.mockResolvedValue(STAT_MEMBERS)
    api.fetchMemberDirectory.mockResolvedValue([])
    api.fetchPastStats.mockResolvedValue({ available: true, rows: STAT_ROWS })
    api.fetchCurrentSeason.mockResolvedValue({ id: "S", name: "Fall 2026", ceremony_at: null, location: null, results_released_at: null })
})
afterEach(cleanup)

describe("Leaderboard", () => {
    it("chips: sort by Wins / Noms / Win %, then All time and each semester, then the locked live season", () => {
        view()
        expect(within(screen.getByRole("group", { name: "Sort by" })).getAllByRole("button").map((b) => b.textContent)).toEqual(["Wins", "Noms", "Win %"])
        expect(within(screen.getByRole("group", { name: "Season" })).getAllByRole("button").map((b) => b.textContent)).toEqual(["All time", "Fall 23", "Spring 24", "Fall 24", "Spring 25", "Fall 25", "Spring 26", "Fall 2026"])
        expect(screen.getByRole("button", { name: "Fall 2026" }).hasAttribute("disabled")).toBe(true)
        expect(screen.getByText("Fall 2026 appears here once results are released.")).toBeTruthy()
        expect(screen.getByRole("button", { name: "Wins" }).getAttribute("aria-pressed")).toBe("true")
        expect(screen.getByRole("button", { name: "All time" }).getAttribute("aria-pressed")).toBe("true")
    })
    it("all time by wins: a flat gold/silver/bronze podium for the top 3, then the rest ranked", () => {
        view()
        const p = podium()
        expect(p).toHaveLength(3)
        expect(p.map((li) => li.textContent)).toEqual([expect.stringContaining("Dakarai"), expect.stringContaining("Rickey"), expect.stringContaining("Micah")])
        const blocks = p.map((li) => li.querySelector("div[aria-hidden]")!.className)
        expect(blocks[0]).toContain("bg-gold")
        expect(blocks[1]).toContain("bg-silver")
        expect(blocks[2]).toContain("bg-bronze")
        const r = rows()
        expect(r).toHaveLength(11) // 14 members - 3 on the podium
        expect(r[0].textContent).toContain("John Sampson")
        expect(r[0].textContent).toContain("4") // rank
    })
    it("the viewer's row is marked You", () => {
        who = "m-Anthony"
        view(<Leaderboard model={model} pendingLabel={null} viewerId="m-Anthony" />)
        expect(within(screen.getByText("Anthony", { selector: "span.break-words" }).closest("li")!).getByText("You")).toBeTruthy()
    })
    it("each row has a small win-rate trend and rows link to the member's read-only stats", () => {
        view()
        const first = rows()[0]
        expect(within(first).getByRole("img", { name: /^Win rate by semester:/ })).toBeTruthy()
        expect(within(first).getByRole("link").getAttribute("href")).toBe("/app/results/members/m-John Sampson")
        expect(within(podium()[0]).getByRole("link").getAttribute("href")).toBe("/app/results/members/m-Dakarai")
    })
    it("sorting by noms re-ranks", () => {
        view()
        press("Sort by", "Noms")
        expect(podium()[0].textContent).toContain("Dakarai") // 86 noms
        expect(screen.getByRole("button", { name: "Noms" }).getAttribute("aria-pressed")).toBe("true")
    })
    it("Win %: only members with enough noms are ranked (5 in a semester); the rest are listed unranked with a note", () => {
        view()
        press("Season", "Spring 24")
        press("Sort by", "Win %")
        expect(screen.getByText(/Win % ranks need 5\+ noms/)).toBeTruthy()
        const few = rows().find((r) => r.textContent?.includes("John Sampson"))! // 3 noms that semester
        expect(few.textContent).toContain("few noms")
        expect(few.textContent).toContain("·") // no rank
        expect(podium()).toHaveLength(3)
        press("Season", "All time")
        expect(screen.getByText(/Win % ranks need 10\+ noms/)).toBeTruthy()
    })
    it("the semester picker filters to members who were in it and lists who was not", () => {
        view()
        press("Season", "Fall 23")
        expect(screen.getByText(/Not in this semester:/).textContent).toMatch(/Demichael.*Rico|Rico.*Demichael/)
        expect(screen.getByText(/Not in this semester:/).textContent).toContain("John Sampson")
        expect(screen.getByRole("region", { name: "Podium, Fall 23" })).toBeTruthy()
        expect(screen.queryByText("Per semester played")).toBeNull() // all time only
    })
    it("Fall 23 / Fall 24 numbers carry a tilde and a footnote; a later semester does not", () => {
        view()
        expect(screen.getAllByText(/^~\d+$/).length).toBeGreaterThan(0)
        expect(screen.getByText(/= counted from slides \(Fall 23, Fall 24\)/)).toBeTruthy()
        press("Season", "Spring 26")
        expect(screen.queryAllByText(/^~/)).toHaveLength(0)
        expect(screen.queryByText(/counted from slides/)).toBeNull()
        press("Season", "Fall 23")
        expect(screen.getByText(/counted from slides/)).toBeTruthy()
    })
    it("a member with no data shows em dashes and No data yet, listed last", () => {
        view()
        const last = rows().at(-1)!
        expect(last.textContent).toContain("Rico")
        expect(last.textContent).toContain("No data yet")
        expect(last.textContent).toContain("—")
        expect(last.textContent).not.toMatch(/\b0%/)
    })
    it("Per semester played is off by default, ranks by the average when on, and is all-time only", () => {
        view()
        const sw = screen.getByRole("switch", { name: "Per semester played" })
        expect(sw.getAttribute("aria-checked")).toBe("false")
        const before = podium().map((li) => li.textContent)
        fireEvent.click(sw)
        expect(sw.getAttribute("aria-checked")).toBe("true")
        const after = podium().map((li) => li.textContent)
        expect(after).not.toEqual(before)
        expect(after[0]).toContain("Demichael") // 6 wins per semester played over 2 semesters
        expect(podium()[0].textContent).toMatch(/per semester/)
        press("Sort by", "Win %")
        expect(screen.queryByRole("switch")).toBeNull()
    })
    it("fewer than 3 ranked members: no podium, just the list", () => {
        const small = buildModel({ rows: STAT_ROWS.filter((r) => r.season_label === "Spring 26" && ["m-Rickey", "m-TJ"].includes(r.member_id)), members: STAT_MEMBERS })
        view(<Leaderboard model={small} pendingLabel={null} viewerId={null} />)
        expect(screen.queryByRole("region", { name: /^Podium/ })).toBeNull()
        expect(screen.getByText("The podium needs at least 3 ranked members.")).toBeTruthy()
    })
    it("the released live season is a normal chip and counts in All time", () => {
        const m = buildModel({ rows: STAT_ROWS, members: STAT_MEMBERS, current: { label: "Fall 2026", tallies: { "m-Rico": { wins: 3, noms: 6 } } } })
        view(<Leaderboard model={m} pendingLabel={null} viewerId={null} />)
        expect(screen.getByRole("button", { name: "Fall 2026" }).hasAttribute("disabled")).toBe(false)
        expect(screen.queryByText(/appears here once results are released/)).toBeNull()
        const rico = rows().find((r) => r.textContent?.includes("Rico"))!
        expect(rico.textContent).not.toContain("No data yet")
    })
})

describe("Compare sheet", () => {
    it("opens with the viewer vs the leader, charts both, and says who has the edge", async () => {
        view()
        fireEvent.click(screen.getByRole("button", { name: "Compare two members" }))
        const dlg = await screen.findByRole("dialog", { name: "Compare two members" })
        expect(within(dlg).getAllByRole("button", { name: "Close" })).toHaveLength(1)
        expect(within(dlg).getByRole("img", { name: /^Rickey against Dakarai/ })).toBeTruthy()
        expect(within(dlg).getByText(/had the higher win rate in \d of 6 shared semesters/)).toBeTruthy()
        expect(within(dlg).getByRole("group", { name: "Member A" })).toBeTruthy()
    })
    it("picking another member re-draws; the other side's member is disabled", async () => {
        view()
        fireEvent.click(screen.getByRole("button", { name: "Compare two members" }))
        const dlg = await screen.findByRole("dialog")
        const b = within(dlg).getByRole("group", { name: "Member B" })
        expect((within(b).getByRole("button", { name: "Rickey" }) as HTMLButtonElement).disabled).toBe(true)
        fireEvent.click(within(b).getByRole("button", { name: "Micah" }))
        expect(within(dlg).getByRole("img", { name: /^Rickey against Micah/ })).toBeTruthy()
    })
    it("fewer than 2 shared semesters: no verdict, just the count", async () => {
        const r = (l: string, o: number, id: string) => ({ season_label: l, season_order: o, member_id: id, noms: 6, wins: 2 })
        const m = buildModel({ rows: [r("S1", 0, "m-Rickey"), r("S2", 1, "m-Rickey"), r("S2", 1, "m-Dakarai"), r("S3", 2, "m-Micah")], members: STAT_MEMBERS })
        view(<Leaderboard model={m} pendingLabel={null} viewerId="m-Rickey" />)
        fireEvent.click(screen.getByRole("button", { name: "Compare two members" }))
        const dlg = await screen.findByRole("dialog")
        expect(within(dlg).getByText(/Only 1 shared semester\. Head to head needs at least 2\./)).toBeTruthy()
        expect(within(dlg).queryByText(/has the edge/)).toBeNull()
    })
})

describe("Leaderboard pane (data states)", () => {
    it("loading, then ready", async () => {
        view(<LeaderboardPane />)
        expect(screen.getByRole("status", { name: "Loading stats" })).toBeTruthy()
        expect(await screen.findByRole("group", { name: "Sort by" })).toBeTruthy()
    })
    it("error: Couldn't load stats with Try again", async () => {
        api.fetchPastStats.mockRejectedValueOnce(new Error("x"))
        view(<LeaderboardPane />)
        expect(await screen.findByText("Couldn't load stats")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(await screen.findByRole("group", { name: "Sort by" })).toBeTruthy()
    })
    it("table missing and empty table", async () => {
        api.fetchPastStats.mockResolvedValueOnce({ available: false })
        view(<LeaderboardPane />)
        expect(await screen.findByText("Previous stats aren't available yet")).toBeTruthy()
        cleanup()
        api.fetchPastStats.mockResolvedValue({ available: true, rows: [] })
        view(<LeaderboardPane />)
        expect(await screen.findByText("No stats yet")).toBeTruthy()
    })
    it("tapping a member opens their read-only stats", async () => {
        const r = render(
            <MemoryRouter initialEntries={["/app/results"]}>
                <Loc />
                <Routes>
                    <Route path="/app/results" element={<LeaderboardPane />} />
                    <Route path="/app/results/members/:memberId" element={<MemberStatsPage />} />
                </Routes>
            </MemoryRouter>,
        )
        await screen.findByRole("region", { name: /^Podium/ })
        fireEvent.click(within(podium()[0]).getByRole("link"))
        expect(screen.getByTestId("loc").textContent).toBe("/app/results/members/m-Dakarai")
        expect(await screen.findByText("Viewing Dakarai")).toBeTruthy()
        expect(r.container.textContent).toContain("Read-only · visible to all members")
    })
})

describe("Member stats page (read-only)", () => {
    const page = (id: string) => render(<MemoryRouter initialEntries={[`/app/results/members/${id}`]}><Routes><Route path="/app/results/members/:memberId" element={<MemberStatsPage />} /></Routes></MemoryRouter>)
    it("shows another member's charts and says Viewing <name>, with a back link to the leaderboard", async () => {
        page("m-Dakarai")
        expect(await screen.findByText("Viewing Dakarai")).toBeTruthy()
        expect(screen.getByText("Where Dakarai stands")).toBeTruthy()
        expect(screen.getByRole("img", { name: /^Dakarai: nominations and wins/ })).toBeTruthy()
        expect(screen.queryByRole("button", { name: /edit/i })).toBeNull()
        expect(screen.getAllByRole("link").some((l) => l.getAttribute("href") === "/app/results?view=leaderboard")).toBe(true)
    })
    it("your own id says (you)", async () => {
        page("m-Rickey")
        expect(await screen.findByText("Viewing Rickey (you)")).toBeTruthy()
    })
    it("Rico (no rows) shows not enough data yet; Demichael shows dashes for missing semesters", async () => {
        page("m-Rico")
        expect(await screen.findByText("Not enough data yet")).toBeTruthy()
        cleanup()
        page("m-Demichael")
        await screen.findByText("Viewing Demichael")
        expect(screen.getByRole("img", { name: /Demichael: nominations and wins.*Fall 23 not in/ })).toBeTruthy()
    })
    it("an unknown member id", async () => {
        page("m-nobody")
        expect(await screen.findByText("We couldn't find that member")).toBeTruthy()
    })
    it("before release the live season stays locked on the read-only view too", async () => {
        page("m-Dakarai")
        await waitFor(() => expect(screen.getByText(/Fall 2026 is locked/)).toBeTruthy())
        expect(api.fetchSeasonResults).not.toHaveBeenCalled()
    })
})
