import { describe, expect, it } from "vitest"
import { committeeGate } from "./RequireCommittee"

describe("committeeGate", () => {
    it("loading while loading", () => {
        expect(committeeGate(true, null)).toBe("loading")
    })
    it("denies without profile", () => {
        expect(committeeGate(false, null)).toBe("deny")
    })
    it("denies non-committee", () => {
        expect(committeeGate(false, { is_committee: false })).toBe("deny")
    })
    it("a failed profile lookup is an error, not a denial (P1-9)", () => {
        expect(committeeGate(false, null, true)).toBe("error")
        expect(committeeGate(false, { is_committee: true }, true)).toBe("allow")
        expect(committeeGate(false, null, false)).toBe("deny")
    })
    it("allows committee", () => {
        expect(committeeGate(false, { is_committee: true })).toBe("allow")
    })
})
