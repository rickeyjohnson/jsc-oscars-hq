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

import { useHomeData } from "../../pages/home/useHomeData"

beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.fetchBallotSummaries.mockResolvedValue([])
    api.fetchMembers.mockResolvedValue([])
    api.fetchMemberAvatars.mockResolvedValue({})
})

describe("useHomeData fetch plan", () => {
    it("does not fetch results (or members) for a member before release", async () => {
        api.fetchCurrentSeason.mockResolvedValue({ id: "S", name: "F", ceremony_at: null, location: null, results_released_at: null })
        const { result } = renderHook(() => useHomeData(false))
        await waitFor(() => expect(result.current.data).not.toBeNull())
        expect(api.fetchSeasonResults).not.toHaveBeenCalled()
        expect(api.fetchReleaseStatus).not.toHaveBeenCalled()
        expect(api.fetchAllVotes).not.toHaveBeenCalled()
        expect(api.fetchMembers).not.toHaveBeenCalled()
    })

    it("reloads when the tab becomes visible again after a minute, not before", async () => {
        api.fetchCurrentSeason.mockResolvedValue({ id: "S", name: "F", ceremony_at: null, location: null, results_released_at: null })
        const { result } = renderHook(() => useHomeData(false))
        await waitFor(() => expect(result.current.data).not.toBeNull())
        expect(api.fetchBallotSummaries).toHaveBeenCalledTimes(1)
        document.dispatchEvent(new Event("visibilitychange"))
        expect(api.fetchBallotSummaries).toHaveBeenCalledTimes(1) // too soon (the release watch only reads the season row)
        vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 61_000 })
        try {
            document.dispatchEvent(new Event("visibilitychange"))
        } finally {
            vi.useRealTimers()
        }
        await waitFor(() => expect(api.fetchBallotSummaries).toHaveBeenCalledTimes(2))
    })
})
