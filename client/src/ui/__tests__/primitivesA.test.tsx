// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { Avatar } from "../Avatar"
import { AvatarStack } from "../AvatarStack"
import { Button } from "../Button"
import { ErrorState } from "../ErrorState"
import { Switch } from "../Switch"
import { Chip } from "../Chip"
import { ListRow } from "../ListRow"
import { GroupedSection } from "../GroupedSection"

describe("Button", () => {
    it("loading disables and announces", () => {
        render(<Button loading loadingLabel="Logging in…">Log in</Button>)
        const b = screen.getByRole("button")
        expect((b as HTMLButtonElement).disabled).toBe(true)
        expect(b.getAttribute("aria-busy")).toBe("true")
        expect(b.textContent).toContain("Logging in…")
    })
    it("renders a link, never link plus button", () => {
        render(<MemoryRouter><Button to="/x">Go</Button></MemoryRouter>)
        const a = screen.getByRole("link", { name: "Go" })
        expect(a.querySelector("button")).toBeNull()
    })
    it("fires onClick", () => {
        const f = vi.fn()
        render(<Button onClick={f}>Hit</Button>)
        fireEvent.click(screen.getByRole("button", { name: "Hit" }))
        expect(f).toHaveBeenCalled()
    })
})

describe("Chip", () => {
    it("shows children", () => {
        render(<Chip tone="lime">Open</Chip>)
        expect(screen.getByText("Open")).toBeTruthy()
    })
})

describe("Avatar", () => {
    it("falls back to initials when the image fails", () => {
        const { container } = render(<Avatar id="m1" name="Ann" src="/bad.jpg" size={40} />)
        const img = container.querySelector("img")!
        fireEvent.error(img)
        expect(container.querySelector("img")).toBeNull()
        expect(screen.getByText("A")).toBeTruthy()
    })
    it("is labelled unless decorative", () => {
        render(<Avatar id="m1" name="Ann" size={40} />)
        expect(screen.getByRole("img", { name: "Ann" })).toBeTruthy()
    })
})

describe("AvatarStack", () => {
    it("shows overflow count", () => {
        const six = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, name: `Person ${i}` }))
        render(<AvatarStack people={six} />)
        expect(screen.getByText("+2")).toBeTruthy()
    })
})

describe("ErrorState", () => {
    it("alerts and retries", () => {
        const r = vi.fn()
        render(<ErrorState title="Oops" body="Broke" onRetry={r} />)
        expect(screen.getByRole("alert")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Try again" }))
        expect(r).toHaveBeenCalled()
    })
})

describe("Switch", () => {
    it("toggles", () => {
        const f = vi.fn()
        render(<Switch checked={false} onChange={f} label="Countdown" />)
        const s = screen.getByRole("switch", { name: "Countdown" })
        expect(s.getAttribute("aria-checked")).toBe("false")
        fireEvent.click(s)
        expect(f).toHaveBeenCalledWith(true)
    })
})

describe("ListRow", () => {
    it("renders a button row inside a grouped section", () => {
        const f = vi.fn()
        render(<GroupedSection header="H"><ListRow title="Row" onClick={f} /></GroupedSection>)
        fireEvent.click(screen.getByRole("button", { name: /Row/ }))
        expect(f).toHaveBeenCalled()
    })
})
