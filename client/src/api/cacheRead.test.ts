import { beforeEach, describe, expect, it, vi } from "vitest"

// A tiny chainable fake: every builder is awaitable and resolves to { data, error } from `tables`.
const h = vi.hoisted(() => {
    const state = {
        tables: {} as Record<string, unknown>,
        calls: [] as string[],
        uid: "u1" as string | null,
        rpcError: null as unknown,
    }
    const builder = (table: string) => {
        state.calls.push(table)
        const b: Record<string, unknown> = {}
        const done = () => Promise.resolve({ data: state.tables[table] ?? [], error: null })
        for (const m of ["select", "eq", "neq", "in", "order", "limit", "update", "upsert", "is", "lte"]) b[m] = () => b
        b.single = () => Promise.resolve({ data: ((state.tables[table] as unknown[]) ?? [])[0], error: null })
        b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => done().then(res, rej)
        return b
    }
    const client = {
        auth: { getSession: () => Promise.resolve({ data: { session: state.uid ? { user: { id: state.uid } } : null }, error: null }) },
        from: (t: string) => builder(t),
        rpc: () => Promise.resolve({ data: "ok", error: state.rpcError }),
    }
    return { state, client }
})
vi.mock("../supabaseClient", () => ({ supabase: h.client }))

import { fetchBallotDetail, fetchCurrentSeason, setBallotStatus } from "./ballots"
import { fetchMemberDirectory, fetchMembers, resetMemberClaim } from "./members"
import { fetchSeasonResults, upsertResults } from "./results"
import { addNominee } from "./votes"
import { cacheClearAll, setStorage } from "../lib/cache/store"
import { clearInflight } from "../lib/cache/dedup"
import { clearUserCache } from "../lib/cache/clear"

class FakeStorage implements Storage {
    m = new Map<string, string>()
    get length() { return this.m.size }
    clear() { this.m.clear() }
    getItem(k: string) { return this.m.get(k) ?? null }
    key(i: number) { return [...this.m.keys()][i] ?? null }
    removeItem(k: string) { this.m.delete(k) }
    setItem(k: string, v: string) { this.m.set(k, v) }
}
let ls: FakeStorage
const stored = () => [...ls.m.keys()]
const count = (t: string) => h.state.calls.filter((c) => c === t).length

const ballotRow = (status: string, id = "B1") => ({ id, season_id: "S", parent_ballot_id: null, name: "Fall", round: "main", status, opens_at: "2026-01-01T00:00:00Z", closes_at: "2026-01-02T00:00:00Z" })
const setBallot = (status: string) => {
    h.state.tables.ballots = [ballotRow(status)]
    h.state.tables.categories = [{ id: "c1", name: "Pic", description: "", sort_order: 0, nominee_mode: "preset", allow_member_add: false, nominees: [] }]
}

beforeEach(() => {
    ls = new FakeStorage()
    setStorage(ls)
    cacheClearAll()
    clearInflight()
    h.state.tables = {}
    h.state.calls = []
    h.state.uid = "u1"
    h.state.rpcError = null
})

describe("members and directory (global SWR)", () => {
    it("second read within the fresh window makes no request; a reload still has it from storage", async () => {
        h.state.tables.members = [{ id: "m1", name: "Ann", user_id: "u9" }]
        expect(await fetchMembers()).toHaveLength(1)
        expect(await fetchMembers()).toHaveLength(1)
        expect(count("members")).toBe(1)
    })
    it("resetMemberClaim drops the cached members and directory", async () => {
        h.state.tables.members = [{ id: "m1", name: "Ann", user_id: "u9" }]
        h.state.tables.profiles = [{ user_id: "u9", image_url: "x" }]
        await fetchMemberDirectory()
        expect(stored().some((k) => k.endsWith(".g.members"))).toBe(true)
        await resetMemberClaim("Ann", "u9")
        expect(stored().some((k) => k.endsWith(".g.members") || k.endsWith(".g.directory"))).toBe(false)
        await fetchMembers()
        expect(count("members")).toBe(2)
    })
    it("sign-out wipes it (clearAll) and a throwing storage still works from memory", async () => {
        h.state.tables.members = [{ id: "m1", name: "Ann", user_id: null }]
        setStorage(null)
        await fetchMembers()
        await fetchMembers()
        expect(count("members")).toBe(1)
    })
})

describe("ballot detail", () => {
    it("a released ballot is served from the per-user cache on the second read", async () => {
        setBallot("released")
        await fetchBallotDetail("B1")
        const second = await fetchBallotDetail("B1")
        expect(second.status).toBe("released")
        expect(count("ballots")).toBe(1)
        expect(stored().some((k) => k.includes(".u.u1.ballotdetail:B1"))).toBe(true)
    })
    it("an open ballot is always read from the server (never served from the cache)", async () => {
        setBallot("open")
        await fetchBallotDetail("B1")
        await fetchBallotDetail("B1")
        expect(count("ballots")).toBe(2)
    })
    it("a draft ballot is never written to storage", async () => {
        setBallot("draft")
        await fetchBallotDetail("B1")
        expect(stored().filter((k) => k.includes("ballotdetail"))).toEqual([])
    })
    it("is per user: another user does not get the first user's released copy, and sign-out clears it", async () => {
        setBallot("released")
        await fetchBallotDetail("B1")
        h.state.uid = "u2"
        await fetchBallotDetail("B1")
        expect(count("ballots")).toBe(2)
        clearUserCache("u1")
        expect(stored().some((k) => k.includes(".u.u1."))).toBe(false)
    })
    it("setBallotStatus and addNominee invalidate cached details", async () => {
        setBallot("released")
        await fetchBallotDetail("B1")
        await setBallotStatus("B1", "open")
        expect(stored().some((k) => k.includes("ballotdetail"))).toBe(false)
        await fetchBallotDetail("B1")
        await addNominee("c1", "X", [])
        expect(stored().some((k) => k.includes("ballotdetail"))).toBe(false)
    })
    it("signed out: nothing is read or written", async () => {
        h.state.uid = null
        setBallot("released")
        await fetchBallotDetail("B1")
        await fetchBallotDetail("B1")
        expect(count("ballots")).toBe(2)
        expect(stored()).toEqual([])
    })
})

describe("season results gate", () => {
    const seasonRow = (released: string | null) => ({ id: "S", name: "F", ceremony_at: null, location: null, results_released_at: released })
    const setResults = () => {
        h.state.tables.ballots = [{ ...ballotRow("released"), id: "B1" }]
        h.state.tables.results = [{ category_id: "c1", winner_nominee_id: "n1" }]
        h.state.tables.categories = [{ id: "c1", name: "Pic", description: "", sort_order: 0, nominee_mode: "preset", allow_member_add: false, nominees: [] }]
    }
    it("before release nothing is stored: not the season, not results, not details of unreleased ballots", async () => {
        h.state.tables.seasons = [seasonRow(null)]
        setResults()
        h.state.tables.ballots = [ballotRow("closed")]
        await fetchCurrentSeason()
        await fetchSeasonResults("S")
        await fetchSeasonResults("S")
        expect(stored().filter((k) => /results:|released:/.test(k))).toEqual([])
        expect(count("results")).toBe(2) // no request was skipped
    })
    it("after a fresh response confirms the release, results are cached per user and served without a request", async () => {
        h.state.tables.seasons = [seasonRow("2026-05-01T00:00:00Z")]
        setResults()
        await fetchCurrentSeason()
        await fetchSeasonResults("S")
        await fetchSeasonResults("S")
        expect(count("results")).toBe(1)
        expect(stored().some((k) => k.includes(".u.u1.results:S:"))).toBe(true)
    })
    it("a committee correction invalidates cached results", async () => {
        h.state.tables.seasons = [seasonRow("2026-05-01T00:00:00Z")]
        setResults()
        await fetchCurrentSeason()
        await fetchSeasonResults("S")
        await upsertResults([{ category_id: "c1" } as never])
        expect(stored().some((k) => k.includes("results:"))).toBe(false)
    })
    it("fetchCurrentSeason itself always asks the server (a new unreleased season must show up)", async () => {
        h.state.tables.seasons = [seasonRow("2026-05-01T00:00:00Z")]
        await fetchCurrentSeason()
        await fetchCurrentSeason()
        expect(count("seasons")).toBe(2)
    })
})
