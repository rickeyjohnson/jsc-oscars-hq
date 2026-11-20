import { describe, it, expect } from "vitest"
import { toUtcIso, countdownParts, closesInLabel, urgency } from "./time"

describe("toUtcIso", () => {
    it("converts a datetime-local value to UTC ISO", () => {
        expect(toUtcIso("2026-11-25T18:00")).toBe("2026-11-25T18:00:00.000Z")
    })
})

describe("time helpers", () => {
    const now = new Date("2026-11-23T00:00:00Z")
    const d = (s: string) => new Date(s)
    it("countdownParts", () => {
        expect(countdownParts(d("2026-12-04T20:00:00Z"), now)).toEqual({ days: 11, hours: 20, minutes: 0, seconds: 0 })
        expect(countdownParts(d("2026-11-22T00:00:00Z"), now)).toBeNull()
    })
    it("closesInLabel", () => {
        expect(closesInLabel(d("2026-11-26T00:00:00Z"), now)).toBe("Closes in 3 days")
        expect(closesInLabel(d("2026-11-24T00:00:00Z"), now)).toBe("Closes in 1 day")
        expect(closesInLabel(d("2026-11-23T05:00:00Z"), now)).toBe("Closes in 5 hours")
        expect(closesInLabel(d("2026-11-23T00:12:00Z"), now)).toBe("Closes in 12 minutes")
        expect(closesInLabel(d("2026-11-22T00:00:00Z"), now)).toBe("Closed")
    })
    it("urgency", () => {
        expect(urgency(d("2026-11-23T05:00:00Z"), now)).toBe("urgent")
        expect(urgency(d("2026-11-25T00:00:00Z"), now)).toBe("soon")
        expect(urgency(d("2026-11-28T00:00:00Z"), now)).toBe("normal")
    })
})
