import { describe, it, expect } from "vitest"
import { toUtcIso } from "./time"

describe("toUtcIso", () => {
    it("converts a datetime-local value to UTC ISO", () => {
        expect(toUtcIso("2026-11-25T18:00")).toBe("2026-11-25T18:00:00.000Z")
    })
})
