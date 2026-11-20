import { describe, it, expect } from "vitest"
import { selectableNominees, groupCandidates, votedCount, dashStates, nextUnvotedIndex, findMatchingNominee, closesInLabel } from "./voting"
import type { Member, Nominee } from "../types"

const nom = (name: string, ids: string[], type: Nominee["type"] = "person"): Nominee => ({
    id: `n-${name}`, display_name: name, type, member_ids: ids,
})
const micah = nom("Micah", ["m-Micah"])
const nick = nom("Nick", ["m-Nick"])
const groupMicahNick = nom("Micah, Nick", ["m-Micah", "m-Nick"], "group")
const groupNickRickey = nom("Nick, Rickey", ["m-Nick", "m-Rickey"], "group")

describe("selectableNominees", () => {
    it("hides nominees linked to me, including groups", () => {
        expect(selectableNominees([micah, nick, groupMicahNick, groupNickRickey], "m-Micah").map((n) => n.display_name)).toEqual(["Nick", "Nick, Rickey"])
    })
    it("returns all when no member", () => {
        expect(selectableNominees([micah], null)).toEqual([micah])
    })
})

describe("groupCandidates", () => {
    const members: Member[] = Array.from({ length: 14 }, (_, i) => ({ id: `m-${i === 0 ? "Micah" : i}`, name: i === 0 ? "Micah" : `P${i}`, user_id: null }))
    it("excludes me", () => {
        const out = groupCandidates(members, "m-Micah")
        expect(out).toHaveLength(13)
        expect(out.find((m) => m.id === "m-Micah")).toBeUndefined()
    })
    it("keeps all when no member", () => {
        expect(groupCandidates(members, null)).toHaveLength(14)
    })
})

describe("votedCount", () => {
    it("counts only listed categories", () => {
        expect(votedCount({ c1: "n1", c3: "n2" }, ["c1", "c2"])).toBe(1)
    })
})

describe("dashStates", () => {
    it("marks voted and current", () => {
        expect(dashStates(["a", "b", "c"], { a: "n", c: "n" }, 1)).toEqual([
            { voted: true, current: false },
            { voted: false, current: true },
            { voted: true, current: false },
        ])
    })
})

describe("nextUnvotedIndex", () => {
    it("finds next after current, wrapping", () => {
        expect(nextUnvotedIndex(["a", "b", "c"], { a: "n", b: "n" }, 0)).toBe(2)
        expect(nextUnvotedIndex(["a", "b", "c"], { b: "n", c: "n" }, 2)).toBe(0)
    })
    it("returns -1 when all voted", () => {
        expect(nextUnvotedIndex(["a"], { a: "n" }, 0)).toBe(-1)
    })
})

describe("findMatchingNominee", () => {
    it("matches trimmed, case-insensitive", () => {
        expect(findMatchingNominee([nom("Civic", [], "outsider")], "  civic ")?.id).toBe("n-Civic")
        expect(findMatchingNominee([nom("Civic", [], "outsider")], "Accord")).toBeUndefined()
    })
})

describe("closesInLabel", () => {
    const now = new Date("2026-11-20T00:00:00Z")
    it("formats", () => {
        expect(closesInLabel("2026-11-23T00:00:00Z", now)).toBe("Closes in 3 days")
        expect(closesInLabel("2026-11-20T05:00:00Z", now)).toBe("Closes in 5 hours")
        expect(closesInLabel("2026-11-20T00:20:00Z", now)).toBe("Closes in 20 minutes")
        expect(closesInLabel("2026-11-19T00:00:00Z", now)).toBe("Closed")
    })
})
