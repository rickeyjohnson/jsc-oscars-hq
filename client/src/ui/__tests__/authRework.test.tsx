// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const signInOAuth = vi.fn()
const rpc = vi.fn()
const navigate = vi.fn()
const refetch = vi.fn()
const status = vi.fn()
const available = vi.fn()
let member: { id: string; name: string; user_id: string } | null = null

vi.mock("../../supabaseClient", () => ({
    supabase: {
        auth: { signInWithOAuth: (...a: unknown[]) => signInOAuth(...a), signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn() },
        rpc: (...a: unknown[]) => rpc(...a),
    },
}))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ session: null, user: { id: "u1", email: "a@b.co" }, loading: false }) }))
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ member, loading: false, profile: null, refetch }) }))
vi.mock("../../components/FallingProfileBallPhysics", () => ({ default: () => <div data-testid="balls" /> }))
vi.mock("../../api/members", () => ({ fetchMemberNameStatus: () => status(), fetchAvailableMemberNames: () => available() }))
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => navigate }))

import LandingPage from "../../pages/LandingPage"
import LoginPage from "../../pages/LoginPage"
import SignupPage from "../../pages/SignupPage"
import ClaimNamePage from "../../pages/ClaimNamePage"
import { shouldClaimName } from "../../lib/claimName"
import { ballKey, ballRingColor } from "../logic/landingBalls"
import { pebbleFor } from "../logic/pebble"
import { PEBBLE_COLORS } from "../tokens"

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)
const NAMES = [
    { name: "Ann", taken: false },
    { name: "Bo", taken: true },
    { name: "Cy", taken: false },
]

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    ;[signInOAuth, rpc, navigate, refetch, status, available].forEach((m) => m.mockReset())
    status.mockResolvedValue(NAMES)
    signInOAuth.mockResolvedValue({ error: null })
    rpc.mockResolvedValue({ error: null })
    refetch.mockResolvedValue(undefined)
    member = null
    sessionStorage.clear()
    vi.unstubAllEnvs()
})
afterEach(cleanup)

describe("Landing rework", () => {
    it("has no tagline and centers the buttons under the logo", () => {
        wrap(<LandingPage />)
        expect(screen.queryByText(/be there or be/i)).toBeNull()
        const main = screen.getByRole("main")
        expect(main.className).toMatch(/justify-center/)
        const logo = screen.getByRole("heading", { level: 1 })
        const start = screen.getByRole("link", { name: "Get started" })
        expect(logo.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(main.contains(start)).toBe(true)
    })
})

describe("falling ball rings", () => {
    it("derives a stable pebble ring color per photo key", () => {
        expect(ballRingColor(0)).toBe(ballRingColor(0))
        expect(ballRingColor(3)).toBe(PEBBLE_COLORS[pebbleFor(ballKey(3))].bg)
    })
    it("draws the ring in the shared afterRender (also used by the reduced-motion layout)", () => {
        const src = readFileSync(join(__dirname, "../../components/FallingProfileBallPhysics.tsx"), "utf8")
        expect(src).toMatch(/ballRingColor/)
        expect(src).toMatch(/stroke\(\)/)
    })
})

describe("Login rework", () => {
    it("flag off: no Google button, email form shown, no logo", () => {
        vi.stubEnv("VITE_GOOGLE_AUTH", "")
        wrap(<LoginPage />)
        expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull()
        expect(screen.getByLabelText("Email")).toBeTruthy()
        expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Welcome back."])
        expect(screen.queryByText(/sidechatting/i)).toBeNull()
    })
    it("flag on: Google first, email behind a toggle, OAuth redirects to /app", async () => {
        vi.stubEnv("VITE_GOOGLE_AUTH", "true")
        wrap(<LoginPage />)
        expect(screen.queryByLabelText("Email")).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: /continue with google/i }))
        await waitFor(() => expect(signInOAuth).toHaveBeenCalled())
        const arg = signInOAuth.mock.calls[0][0]
        expect(arg.provider).toBe("google")
        expect(arg.options.redirectTo).toMatch(/\/app$/)
        fireEvent.click(screen.getByRole("button", { name: /use email instead/i }))
        expect(screen.getByLabelText("Email")).toBeTruthy()
        expect(screen.getByRole("link", { name: "Pick your name" })).toBeTruthy()
    })
})

describe("Signup rework", () => {
    it("crosses out taken names and they cannot be selected", async () => {
        wrap(<SignupPage />)
        const taken = await screen.findByRole("button", { name: /Bo/ })
        expect(taken.getAttribute("aria-disabled")).toBe("true")
        expect(taken.className).toMatch(/line-through/)
        expect(taken.textContent).toMatch(/taken/i)
        fireEvent.click(taken)
        expect(taken.getAttribute("aria-pressed")).toBe("false")
        expect(screen.getByText(/Crossed-out names are taken/)).toBeTruthy()
        expect(document.querySelectorAll("h1 img, header img").length).toBe(0)
    })
    it("falls back to available names only when the status call yields no taken info", async () => {
        status.mockResolvedValue([{ name: "Ann", taken: false }, { name: "Cy", taken: false }])
        wrap(<SignupPage />)
        expect(await screen.findByRole("button", { name: "Ann" })).toBeTruthy()
        expect(screen.queryByRole("button", { name: /Bo/ })).toBeNull()
    })
    it("flag on: Google needs a picked name, remembers it, then OAuth", async () => {
        vi.stubEnv("VITE_GOOGLE_AUTH", "true")
        wrap(<SignupPage />)
        expect(screen.queryByLabelText("Email")).toBeNull()
        fireEvent.click(await screen.findByRole("button", { name: "Cy" }))
        fireEvent.click(screen.getByRole("button", { name: /continue with google/i }))
        await waitFor(() => expect(signInOAuth).toHaveBeenCalled())
        expect(sessionStorage.getItem("jsc.pendingName")).toBe("Cy")
        fireEvent.click(screen.getByRole("button", { name: /use email instead/i }))
        expect(screen.getByLabelText("Username")).toBeTruthy()
    })
    it("flag off: no Google button", async () => {
        wrap(<SignupPage />)
        await screen.findByRole("button", { name: "Ann" })
        expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull()
    })
})

describe("shouldClaimName", () => {
    const base = { user: { id: "u", email: "a@b.co" }, member: null, loading: false, path: "/app" }
    it("redirects a signed-in user with no member away from /app", () => {
        expect(shouldClaimName(base)).toBe(true)
        expect(shouldClaimName({ ...base, path: "/app/ballots" })).toBe(true)
    })
    it("never redirects while loading, without a user, with a member, or on /claim", () => {
        expect(shouldClaimName({ ...base, loading: true })).toBe(false)
        expect(shouldClaimName({ ...base, user: null })).toBe(false)
        expect(shouldClaimName({ ...base, member: { id: "m" } })).toBe(false)
        expect(shouldClaimName({ ...base, path: "/claim" })).toBe(false)
        expect(shouldClaimName({ ...base, path: "/login" })).toBe(false)
    })
    it("leaves committee and test accounts alone", () => {
        expect(shouldClaimName({ ...base, isCommittee: true })).toBe(false)
        expect(shouldClaimName({ ...base, user: { id: "u", email: "x@jsc-test.local" } })).toBe(false)
        expect(shouldClaimName({ ...base, memberFailed: true })).toBe(false)
    })
})

describe("Claim name page", () => {
    it("lists only available names and claims the picked one", async () => {
        wrap(<ClaimNamePage />)
        expect(await screen.findByRole("button", { name: "Ann" })).toBeTruthy()
        expect(screen.queryByRole("button", { name: /Bo/ })).toBeNull()
        fireEvent.click(screen.getByRole("button", { name: "Cy" }))
        fireEvent.click(screen.getByRole("button", { name: "Continue" }))
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/app", { replace: true }))
        expect(rpc).toHaveBeenCalledWith("claim_member_name", { p_name: "Cy" })
        expect(refetch).toHaveBeenCalled()
    })
    it("shows a clear error when the RPC is missing", async () => {
        rpc.mockResolvedValue({ error: { code: "PGRST202", message: "not found" } })
        wrap(<ClaimNamePage />)
        fireEvent.click(await screen.findByRole("button", { name: "Ann" }))
        fireEvent.click(screen.getByRole("button", { name: "Continue" }))
        expect((await screen.findByRole("alert")).textContent).toMatch(/Name claiming isn't set up yet/)
        expect(navigate).not.toHaveBeenCalled()
    })
    it("uses a pending signup name automatically, once", async () => {
        sessionStorage.setItem("jsc.pendingName", "Ann")
        wrap(<ClaimNamePage />)
        await waitFor(() => expect(rpc).toHaveBeenCalledWith("claim_member_name", { p_name: "Ann" }))
        expect(sessionStorage.getItem("jsc.pendingName")).toBeNull()
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/app", { replace: true }))
        expect(rpc).toHaveBeenCalledTimes(1)
    })
    it("goes straight to /app when the user already has a member", async () => {
        member = { id: "m", name: "Ann", user_id: "u1" }
        wrap(<ClaimNamePage />)
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/app", { replace: true }))
    })
})
