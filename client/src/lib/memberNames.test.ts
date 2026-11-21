import { describe, expect, it } from "vitest"
import { memberRows, memberSummary, resetWarning } from "./memberNames"
import type { Member } from "../types"

const m = (name: string, user_id: string | null): Member => ({ id: name, name, user_id })

describe("memberNames", () => {
    it("summarises names and signups", () => {
        expect(memberSummary([m("Anthony", "u1"), m("Demichael", null), m("Micah", "u2")])).toBe("3 names · 2 signed up")
    })
    it("builds the reset warning with pluralised votes", () => {
        expect(resetWarning("Micah", 31)).toBe("This deletes Micah's 31 votes and frees the name so they can sign up again. Their login also has to be deleted in Supabase (Auth → Users).")
        expect(resetWarning("Micah", 1)).toContain("Micah's 1 vote and")
        expect(resetWarning("Micah", 0)).toContain("Micah's 0 votes")
    })
    it("sorts rows by name with status and own flag", () => {
        const rows = memberRows([m("Micah", "u2"), m("Anthony", "u1"), m("Demichael", null)], "u1")
        expect(rows.map((r) => r.name)).toEqual(["Anthony", "Demichael", "Micah"])
        expect(rows.map((r) => r.status)).toEqual(["signed up", "available", "signed up"])
        expect(rows.map((r) => r.isYou)).toEqual([true, false, false])
        expect(memberRows([m("A", null)], null)[0].isYou).toBe(false)
    })
})
