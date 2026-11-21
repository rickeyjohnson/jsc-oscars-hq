import { describe, expect, it } from "vitest"
import { buildIcs, icsFileName } from "../logic/ics"

const base = { uid: "s1@jsc-oscars", title: "JSC Oscars", start: new Date("2026-12-04T21:00:00Z"), durationMinutes: 180, now: new Date("2026-11-21T00:00:00Z") }

describe("buildIcs", () => {
    it("pins exact output", () => {
        expect(buildIcs({ ...base, location: "Kadin's, 12 Main St; Apt 2", description: "Line one\nLine two" })).toBe(
            [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//JSC Oscars//Home//EN",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "BEGIN:VEVENT",
                "UID:s1@jsc-oscars",
                "DTSTAMP:20261121T000000Z",
                "DTSTART:20261204T210000Z",
                "DTEND:20261205T000000Z",
                "SUMMARY:JSC Oscars",
                "LOCATION:Kadin's\\, 12 Main St\\; Apt 2",
                "DESCRIPTION:Line one\\nLine two",
                "END:VEVENT",
                "END:VCALENDAR",
                "",
            ].join("\r\n"),
        )
    })
    it("omits null location and empty description", () => {
        const s = buildIcs({ ...base, location: null })
        expect(s).not.toContain("LOCATION")
        expect(s).not.toContain("DESCRIPTION")
    })
    it("escapes backslashes and drops bare CR", () => {
        expect(buildIcs({ ...base, title: "a\\b\r\nc" })).toContain("SUMMARY:a\\\\b\\nc\r\n")
    })
    it("folds lines at 75 octets with a leading space, never splitting a character", () => {
        const s = buildIcs({ ...base, description: "é".repeat(100) })
        const lines = s.split("\r\n")
        for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75)
        const unfolded = s.replace(/\r\n /g, "")
        expect(unfolded).toContain("DESCRIPTION:" + "é".repeat(100))
        expect(lines.some((l) => l.startsWith(" "))).toBe(true)
    })
    it("accepts a domain-qualified uid verbatim", () => {
        expect(buildIcs({ ...base, uid: "season-1@jsc-oscars" })).toContain("UID:season-1@jsc-oscars\r\n")
    })
    it("is stable for identical input", () => expect(buildIcs(base)).toBe(buildIcs({ ...base })))
})

describe("icsFileName", () => {
    it("slugs the title", () => {
        expect(icsFileName("JSC Oscars 2026")).toBe("jsc-oscars-2026.ics")
        expect(icsFileName("  !!! ")).toBe("event.ics")
    })
})
