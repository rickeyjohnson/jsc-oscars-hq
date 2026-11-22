import { describe, expect, it } from "vitest"
import { closingLabelNY, joinNames, reminderMessage } from "./reminder"

const closesAt = new Date("2026-11-29T01:00:00Z") // Sat Nov 28, 8:00 PM New York
const base = { ballotName: "Round 1", closesAt, siteUrl: "https://jsc.example" }

describe("reminderMessage", () => {
    it("says everyone voted when nobody is missing", () => {
        expect(reminderMessage({ ...base, missing: [] })).toBe("Everyone has voted on Round 1. Thanks, all!")
    })
    it("one person, first name only", () => {
        const m = reminderMessage({ ...base, missing: ["Dee Walker"] })
        expect(m).toBe("Dee, you haven't voted yet on Round 1. Voting closes Sat, Nov 28, 8:00 PM ET. Vote here: https://jsc.example")
    })
    it("two and three people", () => {
        expect(reminderMessage({ ...base, missing: ["Ann Lee", "Bo Chan"] })).toContain("Ann and Bo, you haven't")
        expect(reminderMessage({ ...base, missing: ["Ann", "Bo", "Cy Z"] })).toContain("Ann, Bo, and Cy, you haven't")
    })
    it("long list keeps every name and the link", () => {
        const missing = Array.from({ length: 20 }, (_, i) => `Person${i} Last`)
        const m = reminderMessage({ ...base, missing })
        for (let i = 0; i < 20; i++) expect(m).toContain(`Person${i}`)
        expect(m).not.toContain("Last")
        expect(m.endsWith("https://jsc.example")).toBe(true)
    })
})

describe("closingLabelNY", () => {
    it("uses New York time across DST", () => {
        expect(closingLabelNY(new Date("2026-07-01T00:30:00Z"))).toBe("Tue, Jun 30, 8:30 PM ET")
    })
})

describe("joinNames", () => {
    it("handles 0-2", () => {
        expect(joinNames([])).toBe("")
        expect(joinNames(["A"])).toBe("A")
        expect(joinNames(["A", "B"])).toBe("A and B")
    })
})
