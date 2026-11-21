import { describe, it, expect } from "vitest"
import { pendingBallots, selectableNominees, groupCandidates, votedCount, dashStates, nextUnvotedIndex, findMatchingNominee, ballotCardStatus, completionByMember, chipStatus, lockedNominees, nomineePebbles, findGroupBySet, joinNames, classifySaveError, saveErrorMessage, reviewRows, firstUnvotedIndex } from "./voting"
import { avatarFallback } from "../ui/logic/avatar"
import type { Ballot, Member, Nominee } from "../types"

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

describe("ballotCardStatus", () => {
    const now = new Date("2026-11-23T00:00:00Z")
    const openBallot: Ballot = { id: "b", season_id: "s", parent_ballot_id: null, name: "B", round: "main", status: "open", opens_at: "2026-11-22T00:00:00Z", closes_at: "2026-11-26T00:00:00Z" }
    it("derives the card status", () => {
        expect(ballotCardStatus(openBallot, 3, 3, now)).toBe("voted")
        expect(ballotCardStatus(openBallot, 3, 1, now)).toBe("open")
        expect(ballotCardStatus({ ...openBallot, status: "closed" }, 3, 1, now)).toBe("closed")
        expect(ballotCardStatus({ ...openBallot, closes_at: "2026-11-22T00:00:00Z" }, 3, 1, now)).toBe("closed")
        expect(ballotCardStatus({ ...openBallot, opens_at: "2026-11-24T00:00:00Z" }, 3, 0, now)).toBe("upcoming")
    })
})

describe("pendingBallots", () => {
    const now = new Date("2026-11-23T00:00:00Z")
    const base = { id: "b", season_id: "s", parent_ballot_id: null, name: "B", round: "main" as const, status: "open" as const, opens_at: "2026-11-22T00:00:00Z", closes_at: "2026-11-26T00:00:00Z" }
    it("keeps only open ballots with unvoted categories", () => {
        const list = [
            { ...base, id: "a", category_count: 3, my_vote_count: 1 },
            { ...base, id: "done", category_count: 3, my_vote_count: 3 },
            { ...base, id: "empty", category_count: 0, my_vote_count: 0 },
            { ...base, id: "closed", status: "closed" as const, category_count: 3, my_vote_count: 0 },
        ]
        expect(pendingBallots(list, now).map((b) => b.id)).toEqual(["a"])
    })
})

describe("completionByMember", () => {
    const members: Member[] = [
        { id: "m1", name: "Micah", user_id: "u1" },
        { id: "m2", name: "Nick", user_id: "u2" },
        { id: "m3", name: "Rico", user_id: null },
    ]
    it("counts votes per member, sorted least-voted first, ignoring non-members", () => {
        const votes = [
            { voter_id: "u1", category_id: "c1" },
            { voter_id: "u1", category_id: "c2" },
            { voter_id: "ghost", category_id: "c1" },
        ]
        expect(completionByMember(members, votes, 3)).toEqual([
            { name: "Nick", voted: 0, total: 3, claimed: true },
            { name: "Rico", voted: 0, total: 3, claimed: false },
            { name: "Micah", voted: 2, total: 3, claimed: true },
        ])
    })
})

describe("completionByMember edge cases", () => {
    const members: Member[] = [{ id: "m1", name: "Micah", user_id: "u1" }]
    it("counts duplicate votes in one category once", () => {
        expect(completionByMember(members, [{ voter_id: "u1", category_id: "c1" }, { voter_id: "u1", category_id: "c1" }], 3)[0].voted).toBe(1)
    })
    it("caps at the category count", () => {
        const votes = ["c1", "c2", "c3", "c4"].map((category_id) => ({ voter_id: "u1", category_id }))
        expect(completionByMember(members, votes, 3)[0].voted).toBe(3)
    })
})

describe("chipStatus", () => {
    const now = new Date("2026-11-23T00:00:00Z")
    it("shows ended for open ballots past close", () => {
        expect(chipStatus({ status: "open", closes_at: "2026-11-22T00:00:00Z" }, now)).toBe("ended")
        expect(chipStatus({ status: "open", closes_at: "2026-11-24T00:00:00Z" }, now)).toBe("open")
        expect(chipStatus({ status: "closed", closes_at: "2026-11-22T00:00:00Z" }, now)).toBe("closed")
    })
})

describe("nextUnvotedIndex from before the first card", () => {
    it("reaches index 0 when nothing is active yet", () => {
        expect(nextUnvotedIndex(["a", "b", "c"], {}, -1)).toBe(0)
        expect(nextUnvotedIndex(["a", "b", "c"], { a: "x" }, -1)).toBe(1)
    })
})

describe("group vote helpers", () => {
    it("locks groups I'm in but hides me as a person", () => {
        const me = nom("Me", ["m-me"])
        const g = nom("Me, Nick", ["m-me", "m-Nick"], "group")
        expect(lockedNominees([me, g, nick, groupMicahNick], "m-me").map((n) => n.display_name)).toEqual(["Me, Nick"])
        expect(lockedNominees([g], null)).toEqual([])
    })
    it("people keep their member pebble; others take pebbles in list order, all seven before repeating", () => {
        const others = Array.from({ length: 8 }, (_, i) => nom(`G${i}`, [`a${i}`, `b${i}`], "group"))
        const p = nomineePebbles([micah, ...others])
        expect(p[micah.id]).toBe(avatarFallback("m-Micah"))
        expect(others.slice(0, 7).map((n) => p[n.id])).toEqual(["strawberry", "cherry", "tangerine", "lemon", "lime", "sky", "grape"])
        expect(p[others[7].id]).toBe("strawberry")
    })
    it("finds an existing group by its set of people", () => {
        expect(findGroupBySet([groupMicahNick], ["m-Nick", "m-Micah"])).toBe(groupMicahNick)
        expect(findGroupBySet([groupMicahNick], ["m-Nick"])).toBeUndefined()
    })
    it("joins names", () => {
        expect(joinNames(["A", "B"])).toBe("A & B")
        expect(joinNames(["A", "B", "C"])).toBe("A, B & C")
    })
    it("classifies save errors", () => {
        const open = new Date(Date.now() + 1000)
        const now = new Date()
        expect(classifySaveError(new Error("x"), new Date(Date.now() - 1), now)).toBe("closed")
        expect(classifySaveError(new TypeError("Failed to fetch"), open, now)).toBe("network")
        expect(classifySaveError(new Error("x"), open, now, false)).toBe("network")
        expect(classifySaveError({ code: "42501", message: "new row violates row-level security" }, open, now)).toBe("rule")
        expect(classifySaveError(new Error("x"), open, now)).toBe("generic")
        expect(classifySaveError(new Error("x"), open, now, true, "closed")).toBe("closed")
        expect(classifySaveError({ message: "ballot is not open" }, open, now)).toBe("closed")
        expect(classifySaveError({ message: "a group needs at least two different members" }, open, now)).toBe("groupSize")
        expect(classifySaveError({ message: "a different nominee with this name already exists" }, open, now)).toBe("nameTaken")
        expect(classifySaveError({ message: "account is not linked to a member" }, open, now)).toBe("unlinked")
        for (const k of ["groupSize", "nameTaken", "unlinked", "closed", "rule"] as const) expect(saveErrorMessage(k).canRetry).toBe(false)
        expect(saveErrorMessage("generic").canRetry).toBe(true)
        expect(saveErrorMessage("closed", new Date()).title).toMatch(/^Voting closed at /)
        expect(saveErrorMessage("closed").canRetry).toBe(false)
        expect(saveErrorMessage("network").canRetry).toBe(true)
    })
    it("review rows show picks, pebbles, and skipped categories", () => {
        const cats = [
            { id: "c1", name: "One", description: "", order: 0, nominee_mode: "group" as const, allow_member_add: false, nominees: [groupMicahNick] },
            { id: "c2", name: "Two", description: "", order: 1, nominee_mode: "preset" as const, allow_member_add: false, nominees: [nick] },
        ]
        const rows = reviewRows(cats, { c1: groupMicahNick.id }, "m-me")
        expect(rows[0]).toMatchObject({ pick: "Micah, Nick", pebble: "strawberry" })
        expect(rows[1]).toMatchObject({ pick: null, pebble: null })
        expect(firstUnvotedIndex(["c1", "c2"], { c1: "x" })).toBe(1)
    })
})
