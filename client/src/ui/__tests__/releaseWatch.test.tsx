// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useReleaseWatch } from "../useReleaseWatch"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
    cleanup()
    vi.useRealTimers()
})
const tick = async (ms: number) => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
    })
}

describe("useReleaseWatch", () => {
    it("polls every 30s while sealed, fires once when released, then stops polling", async () => {
        const check = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValue(true)
        const onReleased = vi.fn()
        renderHook(() => useReleaseWatch(true, onReleased, check))
        await tick(29_000)
        expect(check).not.toHaveBeenCalled()
        await tick(1_000)
        expect(check).toHaveBeenCalledTimes(1)
        expect(onReleased).not.toHaveBeenCalled()
        await tick(30_000)
        expect(onReleased).toHaveBeenCalledTimes(1)
        await tick(120_000)
        expect(check).toHaveBeenCalledTimes(2)
        expect(onReleased).toHaveBeenCalledTimes(1)
    })
    it("checks on window focus, and not while hidden", async () => {
        const check = vi.fn().mockResolvedValue(false)
        renderHook(() => useReleaseWatch(true, () => {}, check))
        await act(async () => {
            window.dispatchEvent(new Event("focus"))
        })
        expect(check).toHaveBeenCalledTimes(1)
        const vis = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
        await act(async () => {
            window.dispatchEvent(new Event("focus"))
        })
        await tick(60_000)
        expect(check).toHaveBeenCalledTimes(1)
        vis.mockRestore()
    })
    it("does nothing when not active (already released or committee preview)", async () => {
        const check = vi.fn().mockResolvedValue(true)
        const onReleased = vi.fn()
        renderHook(() => useReleaseWatch(false, onReleased, check))
        await tick(120_000)
        expect(check).not.toHaveBeenCalled()
        expect(onReleased).not.toHaveBeenCalled()
    })
    it("survives a failed check and tries again", async () => {
        const check = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(true)
        const onReleased = vi.fn()
        renderHook(() => useReleaseWatch(true, onReleased, check))
        await tick(30_000)
        await tick(30_000)
        expect(onReleased).toHaveBeenCalledTimes(1)
    })
})
