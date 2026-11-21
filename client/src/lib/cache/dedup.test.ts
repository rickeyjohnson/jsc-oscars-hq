import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearInflight, dedupe, forget } from "./dedup"

beforeEach(clearInflight)

describe("dedupe", () => {
    it("shares one promise between concurrent calls", async () => {
        const run = vi.fn(async () => 1)
        const [a, b] = await Promise.all([dedupe("k", run), dedupe("k", run)])
        expect([a, b]).toEqual([1, 1])
        expect(run).toHaveBeenCalledTimes(1)
    })
    it("re-fetches after settling (no stale reuse)", async () => {
        const run = vi.fn(async () => 1)
        await dedupe("k", run)
        await dedupe("k", run)
        expect(run).toHaveBeenCalledTimes(2)
    })
    it("clears the entry on rejection", async () => {
        const run = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(2)
        await expect(dedupe("k", run)).rejects.toThrow("x")
        await expect(dedupe("k", run)).resolves.toBe(2)
    })
    it("forget makes the next call start fresh even while one is in flight", async () => {
        let n = 0
        const run = vi.fn(async () => ++n)
        const first = dedupe("k", run)
        forget("k")
        const second = dedupe("k", run)
        expect(run).toHaveBeenCalledTimes(2)
        await Promise.all([first, second])
    })
    it("keys are independent", async () => {
        const run = vi.fn(async () => 1)
        await Promise.all([dedupe("a", run), dedupe("b", run)])
        expect(run).toHaveBeenCalledTimes(2)
    })
})
