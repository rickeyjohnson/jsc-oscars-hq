// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { settledLayout } from "../logic/settle"

const signIn = vi.fn()
const signUp = vi.fn()
const navigate = vi.fn()
const fetchNames = vi.fn()
vi.mock("../../supabaseClient", () => ({
    supabase: { auth: { signInWithPassword: (...a: unknown[]) => signIn(...a), signUp: (...a: unknown[]) => signUp(...a), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() } },
}))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ session: null, user: null }) }))
vi.mock("../../api/members", () => ({ fetchAvailableMemberNames: () => fetchNames() }))
vi.mock("../../components/FallingProfileBallPhysics", () => ({ default: () => <div data-testid="balls" /> }))
vi.mock("react-router-dom", async (orig) => ({ ...(await orig<typeof import("react-router-dom")>()), useNavigate: () => navigate }))

import LandingPage from "../../pages/LandingPage"
import LoginPage from "../../pages/LoginPage"
import SignupPage from "../../pages/SignupPage"

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    signIn.mockReset()
    signUp.mockReset()
    navigate.mockReset()
    fetchNames.mockReset().mockResolvedValue(["Ann", "Bo", "Cy"])
})
afterEach(cleanup)

describe("settledLayout", () => {
    it("places every ball inside the box without overlap", () => {
        const pts = settledLayout(13, 375, 700, 40)
        expect(pts).toHaveLength(13)
        for (const p of pts) {
            expect(p.x).toBeGreaterThanOrEqual(40)
            expect(p.x).toBeLessThanOrEqual(375 - 40)
            expect(p.y).toBeLessThanOrEqual(700 - 40)
            expect(p.y).toBeGreaterThanOrEqual(40)
        }
        for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(80 - 0.01)
    })
    it("handles a tiny width", () => {
        expect(settledLayout(5, 50, 300, 40)).toHaveLength(5)
    })
})

describe("Landing", () => {
    it("has an h1 logo and link buttons with no nested button", () => {
        wrap(<LandingPage />)
        expect(screen.getByRole("heading", { level: 1 })).toBeTruthy()
        const start = screen.getByRole("link", { name: "Get started" })
        expect(start.getAttribute("href")).toBe("/signup")
        expect(start.querySelector("button")).toBeNull()
        expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login")
        expect(screen.getByText("Be there or be ...")).toBeTruthy()
    })
    it("uses no cursive font in the source", () => {
        const src = readFileSync(join(__dirname, "../../pages/LandingPage.tsx"), "utf8")
        expect(src).not.toMatch(/windsong|cursive/i)
    })
})

describe("Login", () => {
    it("has labelled fields with autocomplete and a Log in button", () => {
        wrap(<LoginPage />)
        expect(screen.getByLabelText("Email").getAttribute("autocomplete")).toBe("email")
        const pw = screen.getByLabelText("Password")
        expect(pw.getAttribute("autocomplete")).toBe("current-password")
        expect(pw.getAttribute("type")).toBe("password")
        fireEvent.click(screen.getByRole("button", { name: "Show" }))
        expect(pw.getAttribute("type")).toBe("text")
        expect(screen.getByRole("button", { name: "Log in" })).toBeTruthy()
    })
    it("shows the mapped error in an alert", async () => {
        signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } })
        wrap(<LoginPage />)
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } })
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "nope" } })
        fireEvent.click(screen.getByRole("button", { name: "Log in" }))
        await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/\S/))
        expect(navigate).not.toHaveBeenCalled()
    })
    it("opens the reset sheet with the committee hint", () => {
        wrap(<LoginPage />)
        fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }))
        const dlg = screen.getByRole("dialog", { name: "Reset password" })
        expect(within(dlg).getByText(/ask a committee member/i)).toBeTruthy()
    })
})

describe("Signup", () => {
    it("renders name chips before the email field and toggles aria-pressed", async () => {
        wrap(<SignupPage />)
        const chip = await screen.findByRole("button", { name: "Ann" })
        const email = screen.getByLabelText("Email")
        expect(chip.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(chip.getAttribute("aria-pressed")).toBe("false")
        fireEvent.click(chip)
        expect(chip.getAttribute("aria-pressed")).toBe("true")
        fireEvent.click(screen.getByRole("button", { name: "Bo" }))
        expect(chip.getAttribute("aria-pressed")).toBe("false")
        expect(screen.getByLabelText("Password").getAttribute("autocomplete")).toBe("new-password")
        expect(screen.getByLabelText("Email").getAttribute("autocomplete")).toBe("email")
        expect(screen.getByLabelText("Username").getAttribute("autocomplete")).toBe("username")
    })
    it("signs up with member_name only and goes to /app when a session exists", async () => {
        signUp.mockResolvedValue({ data: { session: {} }, error: null })
        wrap(<SignupPage />)
        fireEvent.click(await screen.findByRole("button", { name: "Cy" }))
        fireEvent.change(screen.getByLabelText("Username"), { target: { value: "cy" } })
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "cy@x.co" } })
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret12" } })
        fireEvent.click(screen.getByRole("button", { name: "Create account" }))
        await waitFor(() => expect(navigate).toHaveBeenCalledWith("/app"))
        const arg = signUp.mock.calls[0][0]
        expect(arg.options.data).toEqual({ username: "cy", member_name: "Cy" })
        expect(arg.options.emailRedirectTo).toMatch(/\/signup\/confirmed$/)
    })
    it("opens the verify sheet only without a session", async () => {
        signUp.mockResolvedValue({ data: { session: null }, error: null })
        wrap(<SignupPage />)
        fireEvent.click(await screen.findByRole("button", { name: "Ann" }))
        fireEvent.change(screen.getByLabelText("Username"), { target: { value: "a" } })
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@x.co" } })
        fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret12" } })
        fireEvent.click(screen.getByRole("button", { name: "Create account" }))
        expect(await screen.findByRole("dialog", { name: "Check your email" })).toBeTruthy()
        expect(navigate).not.toHaveBeenCalled()
    })
    it("shows the empty and error states", async () => {
        fetchNames.mockResolvedValue([])
        wrap(<SignupPage />)
        expect(await screen.findByText(/No names left/)).toBeTruthy()
        cleanup()
        fetchNames.mockReset().mockRejectedValueOnce(new Error("x")).mockResolvedValue(["Ann"])
        wrap(<SignupPage />)
        const alert = await screen.findByRole("alert")
        fireEvent.click(within(alert).getByRole("button", { name: "Try again" }))
        expect(await screen.findByRole("button", { name: "Ann" })).toBeTruthy()
    })
})
