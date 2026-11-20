import { describe, it, expect } from "vitest"
import { fetchAllPages } from "./paging"

describe("fetchAllPages", () => {
    const source = Array.from({ length: 25 }, (_, i) => i)
    const page = async (from: number, to: number) => source.slice(from, to + 1)
    it("concatenates pages until a short page", async () => {
        expect(await fetchAllPages(page, 10)).toEqual(source)
    })
    it("handles an exact multiple of the page size", async () => {
        expect(await fetchAllPages(async (f, t) => source.slice(0, 20).slice(f, t + 1), 10)).toHaveLength(20)
    })
    it("handles empty", async () => {
        expect(await fetchAllPages(async () => [], 10)).toEqual([])
    })
})
