import { describe, expect, it } from "vitest"
import { formatCeremony, utcToZonedInput, zonedToUtcIso } from "./ceremony"

describe("ceremony date", () => {
    it("3:00 PM Eastern on Dec 4 is 20:00 UTC (the seeded value)", () => {
        expect(zonedToUtcIso("2026-12-04T15:00")).toBe("2026-12-04T20:00:00.000Z")
        expect(utcToZonedInput("2026-12-04T20:00:00Z")).toBe("2026-12-04T15:00")
    })
    it("respects daylight time", () => {
        expect(zonedToUtcIso("2026-07-04T15:00")).toBe("2026-07-04T19:00:00.000Z")
    })
    it("another zone and a round trip", () => {
        expect(zonedToUtcIso("2026-12-04T12:00", "America/Los_Angeles")).toBe("2026-12-04T20:00:00.000Z")
        expect(zonedToUtcIso(utcToZonedInput("2026-12-04T20:30:00Z"))).toBe("2026-12-04T20:30:00.000Z")
    })
    it("rejects junk and formats with the zone", () => {
        expect(zonedToUtcIso("")).toBeNull()
        expect(formatCeremony("2026-12-04T20:00:00Z")).toBe("Fri, Dec 4, 2026, 3:00 PM EST")
    })
})
