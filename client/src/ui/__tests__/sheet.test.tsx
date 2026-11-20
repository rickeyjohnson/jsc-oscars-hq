// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Sheet } from "../Sheet"
import { ConfirmProvider, useConfirm } from "../ConfirmProvider"

function mockDesktop(on: boolean) {
    window.matchMedia = ((q: string) => ({ matches: on && q.includes("1024"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
}

function Harness({ dirty = false }: { dirty?: boolean }) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <button onClick={() => setOpen(true)}>Open it</button>
            <Sheet open={open} onClose={() => setOpen(false)} title="Edit thing" dirty={dirty}>
                <input aria-label="Name" />
                <button>Inner</button>
            </Sheet>
        </>
    )
}

beforeEach(() => mockDesktop(false))
afterEach(() => {
    document.body.style.overflow = ""
})

describe("Sheet", () => {
    it("dialog semantics, focus in, Esc closes, focus returns to opener, scroll lock restored", async () => {
        document.body.style.overflow = "auto"
        render(<Harness />)
        const opener = screen.getByText("Open it")
        opener.focus()
        fireEvent.click(opener)
        const dlg = await screen.findByRole("dialog", { name: "Edit thing" })
        expect(dlg.getAttribute("aria-modal")).toBe("true")
        await waitFor(() => expect(dlg.contains(document.activeElement)).toBe(true))
        expect(document.body.style.overflow).toBe("hidden")
        fireEvent.keyDown(document, { key: "Escape" })
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
        expect(document.activeElement).toBe(opener)
        expect(document.body.style.overflow).toBe("auto")
    })

    it("Tab wraps inside", async () => {
        render(<Harness />)
        fireEvent.click(screen.getByText("Open it"))
        const dlg = await screen.findByRole("dialog")
        const inner = screen.getByText("Inner")
        inner.focus()
        fireEvent.keyDown(dlg, { key: "Tab" })
        expect(dlg.contains(document.activeElement)).toBe(true)
        expect(document.activeElement).not.toBe(inner)
    })

    it("dirty Esc asks to discard before closing", async () => {
        render(<Harness dirty />)
        fireEvent.click(screen.getByText("Open it"))
        await screen.findByRole("dialog", { name: "Edit thing" })
        fireEvent.keyDown(document, { key: "Escape" })
        const alert = await screen.findByRole("alertdialog", { name: "Discard changes?" })
        expect(screen.getByRole("dialog", { name: "Edit thing" })).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: "Discard" }))
        await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit thing" })).toBeNull())
        expect(alert).toBeTruthy()
    })

    it("phone renders a grabber", async () => {
        render(<Harness />)
        fireEvent.click(screen.getByText("Open it"))
        await screen.findByRole("dialog")
        expect(screen.getByRole("button", { name: "Resize sheet" })).toBeTruthy()
    })

    it("desktop renders a centered dialog without a grabber", async () => {
        mockDesktop(true)
        render(<Harness />)
        fireEvent.click(screen.getByText("Open it"))
        await screen.findByRole("dialog")
        expect(screen.queryByRole("button", { name: "Resize sheet" })).toBeNull()
        expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    })
})

function ConfirmHarness({ onResult }: { onResult: (v: boolean) => void }) {
    const confirm = useConfirm()
    return <button onClick={async () => onResult(await confirm({ title: "Close voting?", message: "Votes lock.", confirmLabel: "Close voting", destructive: true }))}>Ask</button>
}

describe("useConfirm", () => {
    it("resolves true on confirm and false on cancel; Cancel focused first", async () => {
        const results: boolean[] = []
        render(
            <ConfirmProvider>
                <ConfirmHarness onResult={(v) => results.push(v)} />
            </ConfirmProvider>,
        )
        fireEvent.click(screen.getByText("Ask"))
        const alert = await screen.findByRole("alertdialog", { name: "Close voting?" })
        expect(alert.getAttribute("aria-modal")).toBe("true")
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })))
        fireEvent.click(screen.getByRole("button", { name: "Close voting" }))
        await waitFor(() => expect(results).toEqual([true]))
        await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())

        fireEvent.click(screen.getByText("Ask"))
        await screen.findByRole("alertdialog")
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
        await waitFor(() => expect(results).toEqual([true, false]))
        await act(async () => {})
    })
    it("Escape resolves false", async () => {
        const results: boolean[] = []
        render(
            <ConfirmProvider>
                <ConfirmHarness onResult={(v) => results.push(v)} />
            </ConfirmProvider>,
        )
        fireEvent.click(screen.getByText("Ask"))
        await screen.findByRole("alertdialog")
        fireEvent.keyDown(document, { key: "Escape" })
        await waitFor(() => expect(results).toEqual([false]))
    })
})

describe("window.confirm", () => {
    it("no window.confirm left in src", () => {
        const root = join(__dirname, "..", "..")
        const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
            const p = join(d, n)
            return statSync(p).isDirectory() ? (n === "__tests__" ? [] : walk(p)) : /\.tsx?$/.test(n) ? [p] : []
        })
        const hits = walk(root).filter((f) => /window\.confirm\(/.test(readFileSync(f, "utf8")))
        expect(hits).toEqual([])
    })
})
