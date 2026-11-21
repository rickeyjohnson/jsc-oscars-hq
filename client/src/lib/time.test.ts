import { describe, it, expect } from "vitest"
import { toUtcIso, countdownParts, closesInLabel, urgency, closesShort } from "./time"

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

describe("closesShort", () => {
    const now = new Date("2026-11-26T12:00:00Z")
    const at = (ms: number) => new Date(now.getTime() + ms)
    const H = 3_600_000
    it("days and hours, hours, minutes", () => {
        expect(closesShort(at(2 * 24 * H + 4 * H + 5000), now)).toBe("Closes in 2d 4h")
        expect(closesShort(at(5 * H + 60_000), now)).toBe("Closes in 5h")
        expect(closesShort(at(20 * 60_000 + 5000), now)).toBe("Closes in 20m")
        expect(closesShort(at(-1), now)).toBe("Closed")
    })
    it("the date once it is over a week away", () => {
        expect(closesShort(new Date("2026-12-04T20:00:00Z"), new Date("2026-11-20T00:00:00Z"))).toMatch(/^Closes Fri, Dec 4 \d{1,2}:\d{2} (AM|PM)$/)
    })
})
