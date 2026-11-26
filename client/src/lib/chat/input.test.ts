import { describe, expect, it } from "vitest"
import { validateMessages } from "../../../../supabase/functions/_shared/chat/input"

const u = (content: unknown) => ({ role: "user", content })

describe("validateMessages", () => {
    it("accepts a normal conversation and trims", () => {
        const r = validateMessages([u("  hi  ")])
        expect(r).toEqual({ ok: true, messages: [{ role: "user", content: "hi" }] })
    })
    it("rejects empty, whitespace, long and non-string text", () => {
        for (const bad of ["", "   ", "x".repeat(501), 5, null]) expect(validateMessages([u(bad)]).ok).toBe(false)
    })
    it("rejects non-arrays, unknown roles and a last assistant message", () => {
        expect(validateMessages("hi").ok).toBe(false)
        expect(validateMessages([]).ok).toBe(false)
        expect(validateMessages([{ role: "system", content: "x" }]).ok).toBe(false)
        expect(validateMessages([u("q"), { role: "assistant", content: "a" }]).ok).toBe(false)
    })
    it("keeps only the last 12", () => {
        const many = Array.from({ length: 20 }, (_, i) => u(`m${i}`))
        const r = validateMessages(many)
        expect(r.ok && r.messages).toHaveLength(12)
        expect(r.ok && r.messages[11].content).toBe("m19")
    })
})
