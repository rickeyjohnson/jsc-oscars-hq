import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TimeoutError, withTimeout } from "./timeout"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("withTimeout", () => {
    it("passes the value through when it settles in time", async () => {
        await expect(withTimeout(Promise.resolve(7), 1000)).resolves.toBe(7)
    })
    it("rejects with TimeoutError when it takes too long", async () => {
        const p = withTimeout(new Promise(() => {}), 1000)
        const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError)
        await vi.advanceTimersByTimeAsync(1001)
        await assertion
    })
    it("passes a rejection through", async () => {
        await expect(withTimeout(Promise.reject(new Error("x")), 1000)).rejects.toThrow("x")
    })
})
