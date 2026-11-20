// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SegmentedControl } from "../SegmentedControl"
import { Podium } from "../Podium"
import { ProgressStrip } from "../ProgressStrip"
import { HoldButton } from "../HoldButton"
import { ToastProvider, useToast } from "../Toast"
import { Countdown } from "../Countdown"

describe("SegmentedControl", () => {
    it("ArrowRight selects the next tab", () => {
        const onChange = vi.fn()
        render(<SegmentedControl label="View" idPrefix="v" options={[{ value: "mine", label: "Mine" }, { value: "leaderboard", label: "Board" }]} value="mine" onChange={onChange} />)
        const tabs = screen.getAllByRole("tab")
        expect(tabs[0].getAttribute("tabindex")).toBe("0")
        expect(tabs[1].getAttribute("tabindex")).toBe("-1")
        fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" })
        expect(onChange).toHaveBeenCalledWith("leaderboard")
    })
})

describe("Podium", () => {
    it("first item has sr-only place text and DOM order is place order", () => {
        render(<Podium items={[{ key: "b", slot: 2, name: "Bee" }, { key: "a", slot: 1, name: "Ay" }]} />)
        const items = screen.getAllByRole("listitem")
        expect(items[0].textContent).toContain("1st place")
        expect(items[0].textContent).toContain("Ay")
    })
    it("avatar only with a photo", () => {
        const { container } = render(<Podium items={[{ key: "a", slot: 1, name: "Ay", avatarUrl: "/x.jpg" }, { key: "b", slot: 2, name: "Bee" }]} />)
        expect(container.querySelectorAll("img")).toHaveLength(1)
    })
})

describe("ProgressStrip", () => {
    const states = Array.from({ length: 30 }, (_, i) => ({ voted: i < 8, current: i === 8 }))
    const labels = states.map((_, i) => `Cat ${i + 1}`)
    const setWidth = (w: number) => Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => w })
    it("narrow: exactly one button", () => {
        setWidth(375)
        const onOpenJump = vi.fn()
        const { container } = render(<ProgressStrip states={states} labels={labels} onJump={() => {}} onOpenJump={onOpenJump} />)
        const b = screen.getByRole("button", { name: "8 of 30 voted. Jump to a category" })
        expect(screen.getAllByRole("button")).toHaveLength(1)
        expect(container.querySelector(".bg-label")).not.toBeNull()
        expect(container.querySelector(".bg-strip-off")).not.toBeNull()
        fireEvent.click(b)
        expect(onOpenJump).toHaveBeenCalled()
    })
    it("wide: per-dash buttons", () => {
        setWidth(1040)
        const onJump = vi.fn()
        render(<ProgressStrip states={states} labels={labels} onJump={onJump} onOpenJump={() => {}} />)
        expect(screen.getAllByRole("button")).toHaveLength(30)
        fireEvent.click(screen.getByRole("button", { name: "Category 3: Cat 3, voted" }))
        expect(onJump).toHaveBeenCalledWith(2)
    })
})

describe("HoldButton", () => {
    const base = { ready: true, busy: false, progress: 0, label: "Hold to release", hint: "Press and hold for 3 seconds" }
    it("keyboard space starts and ends with the synthetic pointer id, ignoring repeats", () => {
        const onDown = vi.fn(), onUp = vi.fn()
        render(<HoldButton {...base} onDown={onDown} onMove={() => {}} onUp={onUp} onCancel={() => {}} />)
        const b = screen.getByRole("button")
        fireEvent.keyDown(b, { key: " " })
        fireEvent.keyDown(b, { key: " ", repeat: true })
        expect(onDown).toHaveBeenCalledTimes(1)
        expect(onDown).toHaveBeenCalledWith(-1, 0, 0)
        fireEvent.keyUp(b, { key: " " })
        expect(onUp).toHaveBeenCalledWith(-1)
    })
    it("not ready: aria-disabled, shows busy label", () => {
        render(<HoldButton {...base} ready={false} busy busyLabel="Releasing…" onDown={() => {}} onMove={() => {}} onUp={() => {}} onCancel={() => {}} />)
        expect(screen.getByRole("button").getAttribute("aria-disabled")).toBe("true")
        expect(screen.getAllByText("Releasing…").length).toBeGreaterThan(0)
    })
    it("reports progress to assistive tech via the hint, not the track", () => {
        render(<HoldButton {...base} progress={0.5} onDown={() => {}} onMove={() => {}} onUp={() => {}} onCancel={() => {}} />)
        expect(screen.getByText("Press and hold for 3 seconds")).toBeTruthy()
    })
})

describe("Toast", () => {
    const Trigger = () => {
        const t = useToast()
        return <button onClick={() => t.show("Saved", { actionLabel: "Undo", onAction: () => {} })}>go</button>
    }
    it("shows a status toast and no-ops outside the provider", () => {
        render(<ToastProvider><Trigger /></ToastProvider>)
        fireEvent.click(screen.getByText("go"))
        expect(screen.getByRole("status").textContent).toContain("Saved")
        expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy()
    })
    it("auto-dismisses after 4s", async () => {
        render(<ToastProvider><Trigger /></ToastProvider>)
        fireEvent.click(screen.getByText("go"))
        expect(screen.getByText("Saved")).toBeTruthy()
        await waitFor(() => expect(screen.queryByText("Saved")).toBeNull(), { timeout: 6000 })
    }, 8000)
    it("useToast outside provider does not throw", () => {
        render(<Trigger />)
        fireEvent.click(screen.getByText("go"))
    })
})

describe("Countdown", () => {
    it("none/live copy", () => {
        const { rerender } = render(<Countdown target={null} />)
        expect(screen.getByText("Date coming soon")).toBeTruthy()
        rerender(<Countdown target={new Date(Date.now() - 1000)} />)
        expect(screen.getByText("It's Oscar night")).toBeTruthy()
    })
})
