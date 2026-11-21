// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { ReactNode } from "react"
import { AppShell } from "../AppShell"
import { RequireAuth } from "../RequireAuth"
import { NotFound } from "../NotFound"
import NavigationTabs from "../../components/NavigationTabs"
import NavigationBar from "../../components/NavigationBar"
import VotePage from "../../pages/VotePage"
import { fetchBallotDetail, fetchBallotSummaries } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import { fetchMyVotes } from "../../api/votes"
import { ballot, category, nominee } from "../../test/fixtures"

const auth = vi.hoisted(() => ({ value: { user: { id: "u-me" } as unknown, loading: false } }))
const userData = vi.hoisted(() => ({
    value: { profile: { user_id: "u-me", display_name: "Mia Me", image_url: "", is_committee: false } as unknown, member: { id: "m-me", name: "Me", user_id: "u-me" } as unknown, loading: false },
}))

vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth.value }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => userData.value, UserDataProvider: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("../../supabaseClient", () => ({ supabase: { auth: { signOut: vi.fn() } } }))
vi.mock("../../api/ballots", () => ({ fetchBallotDetail: vi.fn(), fetchBallotSummaries: vi.fn() }))
vi.mock("../../api/members", () => ({ fetchMembers: vi.fn(), fetchMemberAvatars: vi.fn() }))
vi.mock("../../api/votes", () => ({ fetchMyVotes: vi.fn(), castVote: vi.fn(), clearVote: vi.fn(), addNominee: vi.fn() }))

const setDesktop = (on: boolean) => {
    window.matchMedia = ((q: string) => ({
        matches: on && q.includes("1024"),
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
}

const Stub = ({ name }: { name: string }) => <p>{name} page</p>

const renderAt = (path: string, extra?: ReactNode) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/" element={<p>landing</p>} />
                <Route
                    path="/app"
                    element={
                        <RequireAuth>
                            <AppShell />
                        </RequireAuth>
                    }
                >
                    <Route index element={<Stub name="Home" />} />
                    <Route path="ballots" element={<Stub name="Ballots" />} />
                    <Route path="ballots/:ballotId" element={<VotePage />} />
                    {extra}
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    )

beforeEach(() => {
    vi.resetAllMocks()
    setDesktop(false)
    auth.value = { user: { id: "u-me" }, loading: false }
    userData.value = { profile: { user_id: "u-me", display_name: "Mia Me", image_url: "", is_committee: false }, member: { id: "m-me", name: "Me", user_id: "u-me" }, loading: false }
    vi.mocked(fetchBallotSummaries).mockResolvedValue([])
    vi.mocked(fetchMembers).mockResolvedValue([])
})

describe("AppShell", () => {
    it("phone: tab bar has 4 links, current marked, no nested buttons", () => {
        renderAt("/app/ballots")
        const nav = screen.getByRole("navigation", { name: "Main" })
        const links = within(nav).getAllByRole("link")
        expect(links.map((l) => l.textContent)).toEqual(["Home", "Ballots", "Results", "You"])
        expect(links[1].getAttribute("aria-current")).toBe("page")
        expect(links[0].getAttribute("aria-current")).toBeNull()
        expect(nav.querySelectorAll("button")).toHaveLength(0)
        expect(screen.getByText("Ballots page")).toBeTruthy()
    })

    it("sets the document title per tab and moves focus to the content when a nav link was focused", () => {
        renderAt("/app")
        expect(document.title).toBe("Home | JSC Oscars")
        const link = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Ballots" })
        link.focus()
        fireEvent.click(link)
        expect(document.title).toBe("Ballots | JSC Oscars")
        expect(document.activeElement).toBe(document.getElementById("main-content"))
    })

    it("desktop: sidebar replaces tab bar; user chip links to /app/profile; committee group only for committee", () => {
        setDesktop(true)
        const { unmount } = renderAt("/app")
        expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1)
        const chip = screen.getByRole("link", { name: /mia me/i })
        expect(chip.getAttribute("href")).toBe("/app/profile")
        expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy()
        expect(screen.queryByText("New ballot")).toBeNull()
        unmount()

        userData.value = { ...userData.value, profile: { user_id: "u-me", display_name: "Mia Me", image_url: "", is_committee: true } }
        renderAt("/app")
        for (const t of ["New ballot", "Manage ballots", "Members", "The envelope"]) expect(screen.getByRole("link", { name: t })).toBeTruthy()
    })

    it("hosts the OLD vote page: one Main nav, its bottom bar in the accessory slot", async () => {
        vi.mocked(fetchBallotDetail).mockResolvedValue(ballot({ categories: [category("c1", "Best Picture", [nominee("n-ann", "Ann"), nominee("n-bo", "Bo")])] }))
        vi.mocked(fetchMyVotes).mockResolvedValue({})
        renderAt("/app/ballots/B1")
        expect((await screen.findAllByRole("radio")).length).toBeGreaterThan(0)
        expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1)
        const slot = await screen.findByTestId("shell-accessory")
        expect(await within(slot).findByRole("button", { name: /^review$/i })).toBeTruthy()
    })

    it("unknown /app path → Page not found", () => {
        renderAt("/app/nope")
        expect(screen.getByText("Page not found")).toBeTruthy()
        expect(screen.getByRole("link", { name: /go home/i }).getAttribute("href")).toBe("/app")
    })

    it("signed out → /", () => {
        auth.value = { user: null, loading: false }
        renderAt("/app")
        expect(screen.getByText("landing")).toBeTruthy()
    })

    it("legacy NavigationBar renders nothing and NavigationTabs without children renders nothing", () => {
        const { container } = render(
            <MemoryRouter>
                <NavigationBar />
                <NavigationTabs activeTab="home" />
            </MemoryRouter>,
        )
        expect(container.innerHTML).toBe("")
    })
})
