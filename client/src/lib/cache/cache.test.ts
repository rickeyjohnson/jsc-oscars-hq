import { beforeEach, describe, expect, it, vi } from "vitest"
import { cacheClearAll, cacheDel, cacheGet, cacheSet, resetMemory, setStorage } from "./store"
import { readThrough } from "./swr"
import { clearAll, clearUserCache } from "./clear"
import { clearInflight } from "./dedup"
import { GLOBAL, userScope } from "./keys"

class FakeStorage implements Storage {
    private m = new Map<string, string>()
    throwOnSet = false
    get length() { return this.m.size }
    clear() { this.m.clear() }
    getItem(k: string) { return this.m.get(k) ?? null }
    key(i: number) { return [...this.m.keys()][i] ?? null }
    removeItem(k: string) { this.m.delete(k) }
    setItem(k: string, v: string) {
        if (this.throwOnSet) throw new Error("quota")
        this.m.set(k, v)
    }
}
let ls: FakeStorage
beforeEach(() => {
    ls = new FakeStorage()
    setStorage(ls)
    cacheClearAll()
    clearInflight()
})

describe("store", () => {
    it("round-trips and survives a memory reset via storage", () => {
        cacheSet(GLOBAL, "members", [1, 2], 100)
        resetMemory()
        expect(cacheGet(GLOBAL, "members")?.data).toEqual([1, 2])
    })
    it("discards a different version and corrupt JSON", () => {
        cacheSet(GLOBAL, "a", 1)
        resetMemory()
        const k = ls.key(0)!
        ls.setItem(k, JSON.stringify({ v: 999, at: 1, scope: GLOBAL, data: 1 }))
        expect(cacheGet(GLOBAL, "a")).toBeNull()
        ls.setItem(k, "{nope")
        expect(cacheGet(GLOBAL, "a")).toBeNull()
    })
    it("falls back to memory when storage throws or is missing", () => {
        ls.throwOnSet = true
        cacheSet(GLOBAL, "a", 1)
        expect(cacheGet(GLOBAL, "a")?.data).toBe(1)
        setStorage(null)
        cacheSet(GLOBAL, "b", 2)
        expect(cacheGet(GLOBAL, "b")?.data).toBe(2)
    })
    it("evicts the oldest entries past the cap", () => {
        const big = "x".repeat(200_000)
        cacheSet(GLOBAL, "old", big, 1)
        cacheSet(GLOBAL, "mid", big, 2)
        cacheSet(GLOBAL, "new", big, 3)
        expect(ls.getItem("jsc.cache.v1.g.old")).toBeNull()
        expect(ls.getItem("jsc.cache.v1.g.new")).not.toBeNull()
    })
    it("deletes", () => {
        cacheSet(GLOBAL, "a", 1)
        cacheDel(GLOBAL, "a")
        expect(cacheGet(GLOBAL, "a")).toBeNull()
    })
})

describe("user isolation and clearing", () => {
    it("scopes never leak between users and clear on sign-out", () => {
        cacheSet(userScope("u1"), "profile", { n: "one" })
        cacheSet(userScope("u2"), "profile", { n: "two" })
        cacheSet(GLOBAL, "members", [1])
        expect(cacheGet(userScope("u2"), "profile")?.data).toEqual({ n: "two" })
        clearUserCache("u1")
        expect(cacheGet(userScope("u1"), "profile")).toBeNull()
        expect(ls.length).toBe(2)
        expect(cacheGet(userScope("u2"), "profile")).not.toBeNull()
        clearAll()
        expect(ls.length).toBe(0)
    })
})

describe("readThrough", () => {
    const opts = { fresh: 1000, max: 10_000 }
    it("fetches on miss, then serves fresh without a request", async () => {
        const f = vi.fn(async () => "v1")
        expect((await readThrough(GLOBAL, "k", f, { ...opts, now: 0 })).from).toBe("network")
        const r = await readThrough(GLOBAL, "k", f, { ...opts, now: Date.now() })
        expect(r.from).toBe("fresh-cache")
        expect(f).toHaveBeenCalledTimes(1)
    })
    it("serves stale and revalidates in the background", async () => {
        cacheSet(GLOBAL, "k", "old", 0)
        const f = vi.fn(async () => "new")
        const seen = vi.fn()
        const r = await readThrough(GLOBAL, "k", f, { ...opts, now: 5000, onRevalidate: seen })
        expect(r).toEqual({ data: "old", from: "stale-cache" })
        await vi.waitFor(() => expect(seen).toHaveBeenCalledWith("new"))
        expect(cacheGet(GLOBAL, "k")?.data).toBe("new")
    })
    it("waits for the network past max, and a failed revalidation keeps the cache", async () => {
        cacheSet(GLOBAL, "k", "old", 0)
        expect((await readThrough(GLOBAL, "k", async () => "new", { ...opts, now: 50_000 })).data).toBe("new")
        cacheSet(GLOBAL, "j", "old", 0)
        const r = await readThrough(GLOBAL, "j", async () => { throw new Error("offline") }, { ...opts, now: 5000 })
        expect(r.data).toBe("old")
    })
    it("shouldStore=false keeps data out of every layer", async () => {
        await readThrough(GLOBAL, "res", async () => ({ released: false }), { ...opts, shouldStore: (d) => d.released })
        expect(cacheGet(GLOBAL, "res")).toBeNull()
        expect(ls.length).toBe(0)
    })
    it("a future-dated entry (clock change) is not trusted", async () => {
        cacheSet(GLOBAL, "k", "old", 9_999_999)
        const f = vi.fn(async () => "new")
        expect((await readThrough(GLOBAL, "k", f, { ...opts, now: 0 })).from).toBe("network")
    })
})
