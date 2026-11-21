import { describe, expect, it } from "vitest"
import { canReopen, classifyReopenError, closeTimeProblem, localDateTimeInput, reopenMessage, REOPEN_UNAVAILABLE } from "./reopen"

const NOW = new Date("2026-12-01T12:00:00Z")
const b = (o: object) => ({ status: "closed" as const, closes_at: "2026-11-30T00:00:00Z", opens_at: "2026-11-01T00:00:00Z", round: "main" as const, parent_ballot_id: null, ...o })

describe("reopen", () => {
    it("a missing function reads as not available yet", () => {
        expect(classifyReopenError({ code: "PGRST202", message: "Could not find the function public.reopen_ballot" })).toBe("unavailable")
        expect(reopenMessage({ code: "42883", message: "function does not exist" })).toBe(REOPEN_UNAVAILABLE)
    })
    it("database refusals are shown, anything else is replaced", () => {
        expect(reopenMessage({ code: "P0001", message: "Results are already released, so this ballot cannot be reopened" })).toContain("already released")
        expect(reopenMessage(new Error("socket hang up"))).not.toContain("socket")
    })
    it("canReopen follows the database rules", () => {
        expect(canReopen(b({}), false, false, NOW)).toBe(true)
        expect(canReopen(b({}), true, false, NOW)).toBe(false)
        expect(canReopen(b({}), false, true, NOW)).toBe(false)
        expect(canReopen(b({ status: "released" }), false, false, NOW)).toBe(false)
        expect(canReopen(b({ status: "draft" }), false, false, NOW)).toBe(false)
        expect(canReopen(b({ status: "open", closes_at: "2027-01-01T00:00:00Z" }), false, false, NOW)).toBe(false)
        expect(canReopen(b({ status: "open", closes_at: "2026-11-30T00:00:00Z" }), false, false, NOW)).toBe(true)
        expect(canReopen(b({ round: "tiebreak", parent_ballot_id: "m" }), false, false, NOW)).toBe(true)
    })
    it("default close time is +24h; past times are refused", () => {
        const local = localDateTimeInput(NOW)
        expect(new Date(local).getTime() - new Date(localDateTimeInput(NOW, 0)).getTime()).toBe(86_400_000)
        expect(closeTimeProblem(local, new Date(NOW.getTime() - 3_600_000 * 2))).toBeNull()
        expect(closeTimeProblem("", NOW)).not.toBeNull()
        expect(closeTimeProblem(localDateTimeInput(NOW, -2), NOW)).not.toBeNull()
    })
})
