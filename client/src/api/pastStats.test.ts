import { beforeEach, describe, expect, it, vi } from "vitest"

const order = vi.fn()
vi.mock("../supabaseClient", () => ({ supabase: { from: () => ({ select: () => ({ order: (...a: unknown[]) => order(...a) }) }) } }))
import { fetchPastStats } from "./pastStats"

beforeEach(() => order.mockReset())

describe("fetchPastStats", () => {
    it("returns the rows", async () => {
        order.mockResolvedValue({ data: [{ season_label: "A", season_order: 1, member_id: "m", noms: 2, wins: 1 }], error: null })
        expect(await fetchPastStats()).toEqual({ available: true, rows: [{ season_label: "A", season_order: 1, member_id: "m", noms: 2, wins: 1 }] })
    })
    it("a missing table is 'not available yet', not an error", async () => {
        order.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.past_stats' in the schema cache" } })
        expect(await fetchPastStats()).toEqual({ available: false })
        order.mockResolvedValue({ data: null, error: { code: "42P01", message: "relation does not exist" } })
        expect(await fetchPastStats()).toEqual({ available: false })
    })
    it("other errors throw", async () => {
        order.mockResolvedValue({ data: null, error: { code: "500", message: "boom" } })
        await expect(fetchPastStats()).rejects.toBeTruthy()
    })
})
