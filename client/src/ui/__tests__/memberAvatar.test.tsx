// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { memberFaces } from "../../lib/memberAvatar"
import { avatarFallback } from "../logic/avatar"

const api = vi.hoisted(() => ({ fetchMemberDirectory: vi.fn(), fetchMembers: vi.fn(), countVotesBy: vi.fn(), resetMemberClaim: vi.fn() }))
vi.mock("../../api/members", () => api)
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ member: { id: "m-me", user_id: "u-me" } }) }))

import { MemberAvatar } from "../MemberAvatar"
import { invalidateMemberDirectory } from "../useMemberDirectory"
import MemberNamesPage from "../../pages/committee/MemberNamesPage"
import WhoVoted from "../../components/committee/WhoVoted"

const DIR = [
    { id: "m-ann", name: "Ann", photo: "https://img.test/ann.jpg" },
    { id: "m-bo", name: "Bo", photo: null },
]

beforeEach(() => {
    invalidateMemberDirectory()
    Object.values(api).forEach((f) => f.mockReset())
    api.fetchMemberDirectory.mockResolvedValue(DIR)
    api.fetchMembers.mockResolvedValue([
        { id: "m-ann", name: "Ann", user_id: "u-ann" },
        { id: "m-bo", name: "Bo", user_id: null },
    ])
})
afterEach(cleanup)

describe("memberFaces", () => {
    it("resolves by id or case-insensitive name; key is the member id; unknown falls back to the typed name", () => {
        const f = memberFaces(DIR)
        expect(f.photoFor({ name: "ann" })).toBe("https://img.test/ann.jpg")
        expect(f.photoFor({ memberId: "m-ann", name: "x" })).toBe("https://img.test/ann.jpg")
        expect(f.keyFor({ name: "ANN" })).toBe("m-ann")
        expect(f.photoFor({ name: "Bo" })).toBeNull()
        expect(f.keyFor({ name: "Zed" })).toBe("Zed")
        expect(memberFaces(null).photoFor({ name: "Ann" })).toBeNull()
    })
})

describe("MemberAvatar", () => {
    it("shows the uploaded photo once the directory loads, else initials on the member pebble", async () => {
        const { container } = render(
            <>
                <MemberAvatar name="Ann" size={32} />
                <MemberAvatar name="Bo" size={32} />
            </>,
        )
        await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.test/ann.jpg"))
        expect(container.querySelectorAll("img")).toHaveLength(1)
        expect(container.textContent).toContain("B")
        expect(avatarFallback("m-bo")).toBeTruthy()
    })
    it("falls back to initials when the directory fails", async () => {
        api.fetchMemberDirectory.mockRejectedValue(new Error("x"))
        const { container } = render(<MemberAvatar name="Ann" size={32} />)
        await new Promise((r) => setTimeout(r, 20))
        expect(container.querySelector("img")).toBeNull()
        expect(container.textContent).toContain("A")
    })
})

describe("members everywhere use the same photo", () => {
    it("committee Members page shows the profile photo", async () => {
        const { container } = render(
            <MemoryRouter>
                <MemberNamesPage />
            </MemoryRouter>,
        )
        await screen.findByText("Ann")
        await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.test/ann.jpg"))
    })
    it("Who voted shows the profile photo", async () => {
        const { container } = render(<WhoVoted rows={[{ name: "Ann", voted: 1, total: 2, claimed: true }]} />)
        await waitFor(() => expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.test/ann.jpg"))
    })
})
