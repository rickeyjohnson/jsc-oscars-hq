// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OfflineBanner } from "../OfflineBanner"
import { ErrorBoundary } from "../ErrorBoundary"
import { failureMessage, isNetworkFailure } from "../../lib/failure"
import { OFFLINE_BANNER } from "../../lib/online"

const setOnline = (v: boolean) => Object.defineProperty(navigator, "onLine", { value: v, configurable: true })

afterEach(() => setOnline(true))

describe("OfflineBanner", () => {
    it("is hidden online, appears on the offline event, and goes away on online", () => {
        render(<OfflineBanner />)
        expect(screen.queryByRole("status")).toBeNull()
        act(() => {
            setOnline(false)
            window.dispatchEvent(new Event("offline"))
        })
        expect(screen.getByRole("status").textContent).toContain(OFFLINE_BANNER)
        act(() => {
            setOnline(true)
            window.dispatchEvent(new Event("online"))
        })
        expect(screen.queryByRole("status")).toBeNull()
    })
    it("starts visible when the page loads offline", () => {
        setOnline(false)
        render(<OfflineBanner />)
        expect(screen.getByRole("status")).toBeTruthy()
    })
})

describe("failureMessage", () => {
    it("names the action and the fix", () => {
        expect(failureMessage("save your vote", new TypeError("Failed to fetch"))).toBe("Couldn't save your vote. Check your connection and try again.")
        expect(failureMessage("save this ballot", { message: "boom" })).toContain("Couldn't save this ballot. Try again")
    })
    it("treats offline as a network failure", () => {
        setOnline(false)
        expect(isNetworkFailure(new Error("x"))).toBe(true)
    })
})

describe("ErrorBoundary", () => {
    it("shows a friendly screen with Reload when a child throws", () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const Boom = () => {
            throw new Error("boom")
        }
        const reload = vi.fn()
        Object.defineProperty(window, "location", { value: { ...window.location, reload }, configurable: true })
        render(
            <ErrorBoundary>
                <Boom />
            </ErrorBoundary>
        )
        expect(screen.getByText("Something went wrong")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Reload" }))
        expect(reload).toHaveBeenCalled()
    })
})
