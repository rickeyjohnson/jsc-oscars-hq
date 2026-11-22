// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
    fetchCurrentSeason: vi.fn(), fetchBallotSummaries: vi.fn(), fetchSeasonResults: vi.fn(), fetchReleaseStatus: vi.fn(),
    fetchAllVotes: vi.fn(), fetchMembers: vi.fn(), fetchMemberAvatars: vi.fn(),
}))
vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: api.fetchCurrentSeason, fetchBallotSummaries: api.fetchBallotSummaries }))
vi.mock("../../api/results", () => ({ fetchSeasonResults: api.fetchSeasonResults, fetchReleaseStatus: api.fetchReleaseStatus }))
vi.mock("../../api/votes", () => ({ fetchAllVotes: api.fetchAllVotes }))
vi.mock("../../api/members", () => ({ fetchMembers: api.fetchMembers, fetchMemberAvatars: api.fetchMemberAvatars }))

import { useHomeData } from "../useHomeData"
import { fromHomeSnapshot, HOME_SNAPSHOT_KEY, toHomeSnapshot, type HomeData } from "../logic/homeData"
import { cacheClearAll, cacheGet, cacheSet, setStorage } from "../../lib/cache/store"
import { userScope } from "../../lib/cache/keys"
import { clearUserCache } from "../../lib/cache/clear"

const season = (released: string | null) => ({ id: "S", name: "F", ceremony_at: null, location: null, results_released_at: released })
const full = (released: string | null): HomeData => ({
    season: season(released), released: Boolean(released), summaries: [], results: { categories: [], results: {} },
    ballots: [], checks: [], completion: { ballot: {} as never, members: [] }, errors: {},
})

beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    setStorage(null)
    cacheClearAll()
    api.fetchBallotSummaries.mockResolvedValue([])
    api.fetchMembers.mockResolvedValue([])
    api.fetchMemberAvatars.mockResolvedValue({})
})

describe("home snapshot", () => {
    it("never carries committee data, and carries results only for a released season", () => {
        const sealed = toHomeSnapshot(full(null))!
        expect(sealed.results).toBeNull()
        expect(JSON.stringify(sealed)).not.toContain("completion")
        const open = fromHomeSnapshot(toHomeSnapshot(full("2026-05-01T00:00:00Z"))!)
        expect(open.results).not.toBeNull()
        expect(open.ballots).toBeNull()
        expect(open.checks).toBeNull()
        expect(open.completion).toBeNull()
        expect(toHomeSnapshot({ ...full(null), season: null })).toBeNull()
    })

    it("paints the last snapshot at once, then the server answer replaces it (released flag always revalidated)", async () => {
        cacheSet(userScope("u1"), HOME_SNAPSHOT_KEY, toHomeSnapshot(full("2026-05-01T00:00:00Z")))
        let answer!: (s: unknown) => void
        api.fetchCurrentSeason.mockReturnValue(new Promise((r) => (answer = r)))
        api.fetchSeasonResults.mockResolvedValue({ categories: [], results: {} })
        const { result } = renderHook(() => useHomeData(false, "u1"))
        expect(result.current.data?.released).toBe(true)
        expect(result.current.fromCache).toBe(true)
        answer(season(null)) // server says sealed
        await waitFor(() => expect(result.current.fromCache).toBe(false))
        expect(result.current.data?.released).toBe(false)
        expect(result.current.data?.results).toBeNull()
    })

    it("a failed refresh keeps the cached snapshot on screen", async () => {
        cacheSet(userScope("u1"), HOME_SNAPSHOT_KEY, toHomeSnapshot(full(null)))
        api.fetchCurrentSeason.mockRejectedValue(new Error("db asleep"))
        const { result } = renderHook(() => useHomeData(false, "u1"))
        await waitFor(() => expect(result.current.error).not.toBeNull())
        expect(result.current.data?.season?.id).toBe("S")
        expect(result.current.fromCache).toBe(true)
    })

    it("a fresh load writes the snapshot, but a sealed season stores no results", async () => {
        api.fetchCurrentSeason.mockResolvedValue(season(null))
        api.fetchReleaseStatus.mockResolvedValue({ season: season(null), ballots: [{ id: "B" }], mainCategoryIds: [], results: {} })
        const { result } = renderHook(() => useHomeData(true, "u1"))
        await waitFor(() => expect(result.current.data).not.toBeNull())
        const hit = cacheGet<{ results: unknown }>(userScope("u1"), HOME_SNAPSHOT_KEY)
        expect(hit?.data.results).toBeNull()
        expect(JSON.stringify(hit)).not.toContain("completion")
    })

    it("is per user and gone after sign-out; without a uid nothing is read or written", async () => {
        cacheSet(userScope("u1"), HOME_SNAPSHOT_KEY, toHomeSnapshot(full(null)))
        api.fetchCurrentSeason.mockReturnValue(new Promise(() => {}))
        expect(renderHook(() => useHomeData(false, "u2")).result.current.data).toBeNull()
        expect(renderHook(() => useHomeData(false)).result.current.data).toBeNull()
        clearUserCache("u1")
        expect(renderHook(() => useHomeData(false, "u1")).result.current.data).toBeNull()
    })
})
