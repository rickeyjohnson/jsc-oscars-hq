import { beforeEach, describe, expect, it, vi } from "vitest"

const invoke = vi.fn()
vi.mock("../supabaseClient", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }))
import { ChatError, sendChat } from "./chat"

const turns = [{ role: "user" as const, content: "hi" }]
const httpError = (code: string, error: string) => ({ error: { context: { json: async () => ({ code, error }) } } })

beforeEach(() => invoke.mockReset())

describe("sendChat", () => {
    it("returns the reply and how many are left", async () => {
        invoke.mockResolvedValue({ data: { reply: "Hello.", left: 14 }, error: null })
        expect(await sendChat(turns)).toEqual({ reply: "Hello.", left: 14 })
        expect(invoke).toHaveBeenCalledWith("chat", { body: { messages: turns } })
    })
    it("maps the function's error body to a ChatError", async () => {
        invoke.mockResolvedValue(httpError("limit", "You have used today's questions. Back tomorrow."))
        await expect(sendChat(turns)).rejects.toMatchObject({ code: "limit", message: "You have used today's questions. Back tomorrow." })
    })
    it("maps a busy answer", async () => {
        invoke.mockResolvedValue(httpError("busy", "The assistant is busy. Try again in a minute."))
        await expect(sendChat(turns)).rejects.toMatchObject({ code: "busy" })
    })
    it("treats a network failure as offline", async () => {
        invoke.mockResolvedValue({ data: null, error: new Error("Failed to fetch") })
        const e = await sendChat(turns).catch((x) => x)
        expect(e).toBeInstanceOf(ChatError)
        expect(e.code).toBe("offline")
    })
    it("treats a malformed success as a server error", async () => {
        invoke.mockResolvedValue({ data: { nope: 1 }, error: null })
        await expect(sendChat(turns)).rejects.toMatchObject({ code: "server" })
    })
})
