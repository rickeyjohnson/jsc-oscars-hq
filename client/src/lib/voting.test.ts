import { describe, it, expect } from "vitest"
import { pendingBallots, selectableNominees, groupCandidates, votedCount, dashStates, nextUnvotedIndex, findMatchingNominee, ballotCardStatus, completionByMember, chipStatus } from "./voting"
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
