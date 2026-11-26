// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const send = vi.hoisted(() => vi.fn())
vi.mock("../../api/chat", async () => {
    const actual = await vi.importActual<typeof import("../../api/chat")>("../../api/chat")
    return { ...actual, sendChat: (...a: unknown[]) => send(...a) }
})
vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ member: { id: "m1", name: "Sam Lee" } }) }))

import { ChatError } from "../../api/chat"
import { ChatPanel } from "../../components/chat/ChatPanel"
import { ChatButton } from "../../components/chat/ChatButton"
import { ALLOWED_LINKS as CLIENT_LINKS } from "../../lib/chat/links"
import { ALLOWED_LINKS as SERVER_LINKS } from "../../../../supabase/functions/_shared/chat/links"

const panel = () => render(<MemoryRouter><ChatPanel onClose={() => {}} showHeader /></MemoryRouter>)

beforeEach(() => {
    localStorage.clear()
    send.mockReset()
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})
afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe("Ask Larry panel", () => {
    it("greets by first name and offers four suggestions", () => {
        panel()
        expect(screen.getByText(/Hey Sam, Larry here/)).toBeTruthy()
        for (const s of ["How do I vote?", "Who has the most wins?", "When does voting close?", "Tell me a joke"]) expect(screen.getByRole("button", { name: s })).toBeTruthy()
    })
    it("sends a tapped suggestion, shows the reply as a link button, and the counter", async () => {
        send.mockResolvedValue({ reply: "Check [[go:/app/results|Results]] later.", left: 14 })
        panel()
        fireEvent.click(screen.getByRole("button", { name: "How do I vote?" }))
        await screen.findByRole("link", { name: /Results/ })
        expect(screen.getByRole("link", { name: /Results/ }).getAttribute("href")).toBe("/app/results")
        expect(screen.getByText("14 left today")).toBeTruthy()
        expect(send).toHaveBeenCalledWith([{ role: "user", content: "How do I vote?" }])
    })
    it("never renders a link for a page that is not allowed", async () => {
        send.mockResolvedValue({ reply: "Go [[go:/evil|here]]", left: 3 })
        panel()
        fireEvent.click(screen.getByRole("button", { name: "Tell me a joke" }))
        await screen.findByText(/Go/)
        expect(screen.queryByRole("link")).toBeNull()
    })
    it("a typed question sends and clears the box; empty does nothing", async () => {
        send.mockResolvedValue({ reply: "Hi.", left: 5 })
        panel()
        const input = screen.getByLabelText("Ask a question") as HTMLInputElement
        fireEvent.submit(input.closest("form")!)
        expect(send).not.toHaveBeenCalled()
        fireEvent.change(input, { target: { value: "hello" } })
        fireEvent.submit(input.closest("form")!)
        await screen.findByText("Hi.")
        expect(input.value).toBe("")
    })
    it("the daily limit disables the input and shows the copy", async () => {
        send.mockRejectedValue(new ChatError("limit", "You have used today's questions. Back tomorrow."))
        panel()
        fireEvent.click(screen.getByRole("button", { name: "Tell me a joke" }))
        await waitFor(() => expect((screen.getByLabelText("Ask a question") as HTMLInputElement).disabled).toBe(true))
        expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    })
    it("an offline error offers Try again that resends the question", async () => {
        send.mockRejectedValueOnce(new ChatError("offline", "Couldn't reach Larry. Check your connection and try again.")).mockResolvedValueOnce({ reply: "Back.", left: 9 })
        panel()
        fireEvent.click(screen.getByRole("button", { name: "Tell me a joke" }))
        fireEvent.click(await screen.findByRole("button", { name: "Try again" }))
        await screen.findByText("Back.")
        expect(send).toHaveBeenCalledTimes(2)
        expect(screen.getAllByText("Tell me a joke")).toHaveLength(1)
    })
})

describe("Ask Larry button", () => {
    it("shows on Home and hides on the vote screen", () => {
        const { unmount } = render(<MemoryRouter initialEntries={["/app"]}><ChatButton /></MemoryRouter>)
        expect(screen.getByRole("button", { name: /Ask Larry/ })).toBeTruthy()
        unmount()
        render(<MemoryRouter initialEntries={["/app/ballots/abc"]}><ChatButton /></MemoryRouter>)
        expect(screen.queryByRole("button", { name: /Ask Larry/ })).toBeNull()
    })
})

describe("link lists", () => {
    it("client and server allowlists match", () => {
        expect(CLIENT_LINKS).toEqual(SERVER_LINKS)
    })
})

describe("Ask Larry history", () => {
    beforeEach(() => {
        localStorage.clear()
    })
    it("keeps the conversation after the panel is closed and reopened, and Clear chat forgets it", async () => {
        send.mockResolvedValue({ reply: "Sure thing.", left: 9 })
        panel()
        fireEvent.click(screen.getByRole("button", { name: "Tell me a joke" }))
        await screen.findByText("Sure thing.")
        cleanup()
        panel()
        expect(screen.getByText("Sure thing.")).toBeTruthy()
        expect(screen.getByText("Tell me a joke", { selector: "p, div, span" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Clear chat" }))
        cleanup()
        panel()
        expect(screen.queryByText("Sure thing.")).toBeNull()
    })
    it("sign-out wipes saved chats", async () => {
        const { saveChat, loadChat, clearAllChats } = await import("../../lib/chat/history")
        saveChat("m1", [{ id: 1, role: "user", text: "hi" }])
        expect(loadChat("m1")).toHaveLength(1)
        clearAllChats()
        expect(loadChat("m1")).toHaveLength(0)
    })
})
