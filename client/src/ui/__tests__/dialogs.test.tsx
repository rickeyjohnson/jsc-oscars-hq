// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../context/UserContenxt", () => ({ useUserData: () => ({ fetchOscars: async () => [], profile: null, member: null, refetch: async () => {} }) }))
vi.mock("../../supabaseClient", () => ({ supabase: { from: () => ({}), auth: {} } }))

import { ConfirmSheet } from "../ConfirmSheet"
import { Sheet } from "../Sheet"
import { SeasonSheet } from "../../components/committee/SeasonSheet"
import JokeGeneratorModal from "../../components/JokeGeneratorModal"
import GroupSheet from "../../components/vote/GroupSheet"

vi.mock("../../api/ballots", () => ({ fetchCurrentSeason: vi.fn().mockResolvedValue(null), updateSeason: vi.fn() }))

const src = join(__dirname, "..", "..")
const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
        const p = join(dir, n)
        if (statSync(p).isDirectory()) return n === "__tests__" ? [] : walk(p)
        return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
    })

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
})
afterEach(cleanup)

const checkDialog = async (name: RegExp | string, role: "dialog" | "alertdialog" = "dialog") => {
    const dlg = await screen.findByRole(role, { name })
    expect(dlg.getAttribute("aria-modal")).toBe("true")
    const labelled = dlg.getAttribute("aria-labelledby")!
    expect(document.getElementById(labelled)).toBeTruthy()
    return dlg
}

describe("every Sheet-based dialog", () => {
    it("has role, aria-modal, a label, and exactly one Close button", async () => {
        const noop = () => {}
        const cases: [string, React.ReactElement, RegExp | string][] = [
            ["Sheet", <Sheet open onClose={noop} title="Plain sheet">x</Sheet>, "Plain sheet"],
            ["SeasonSheet", <SeasonSheet open onClose={noop} />, "Season"],
            ["JokeGeneratorModal", <JokeGeneratorModal isOpen onClose={noop} />, "Joke"],
            ["GroupSheet", <GroupSheet open candidates={[]} onClose={noop} onSubmit={noop} />, "Add a group"],
        ]
        for (const [, ui, name] of cases) {
            const { unmount } = render(<MemoryRouter>{ui}</MemoryRouter>)
            const dlg = await checkDialog(name)
            const closes = Array.from(dlg.querySelectorAll("button")).filter((b) => b.getAttribute("aria-label") === "Close")
            expect(closes, String(name)).toHaveLength(1)
            expect(dlg.querySelector("footer, [data-title]")).toBeTruthy()
            unmount()
        }
    })
    it("the Close button is in the header (top-right), not the footer", async () => {
        render(<Sheet open onClose={() => {}} title="T" footer={<button>Go</button>}>x</Sheet>)
        const dlg = await checkDialog("T")
        expect(dlg.querySelector("header")!.querySelector('[aria-label="Close"]')).toBeTruthy()
        expect(dlg.querySelector("footer")!.querySelector('[aria-label="Close"]')).toBeNull()
    })
})

describe("confirm dialogs", () => {
    it("are alertdialogs with a label, no X, and a customizable cancel label", async () => {
        render(<ConfirmSheet open title="Sure?" confirmLabel="Yes" cancelLabel="Keep editing" onConfirm={() => {}} onCancel={() => {}} />)
        const dlg = await checkDialog("Sure?", "alertdialog")
        expect(dlg.querySelector('[aria-label="Close"]')).toBeNull()
        expect(screen.getByRole("button", { name: "Keep editing" })).toBeTruthy()
    })
})

describe("one dialog system", () => {
    it("only ui/Sheet and ui/ConfirmSheet implement a dialog; nothing else hand-rolls role=dialog", () => {
        // Envelope is the full-screen results reveal (a ceremony, not a form dialog); it is the one allowed exception.
        const owners = ["ui/Sheet.tsx", "ui/ConfirmSheet.tsx", "ui/Envelope.tsx"]
        const hits = walk(src)
            .map((f) => relative(src, f).split(sep).join("/"))
            .filter((f) => !owners.includes(f))
            .filter((f) => /role="(alert)?dialog"/.test(readFileSync(join(src, f), "utf8")))
        expect(hits).toEqual([])
    })
    it("no dead modal files: every component named *Modal*/CreateOscarsEvent is imported somewhere", () => {
        const files = walk(src)
        const all = files.map((f) => readFileSync(f, "utf8")).join("\n")
        const dead = files
            .map((f) => relative(src, f).split(sep).join("/"))
            .filter((f) => /^components\/(\w*Modal\w*|CreateOscarsEvent|EditOscarEvent)\.tsx$/.test(f))
            .filter((f) => !new RegExp(`/${f.split("/").pop()!.replace(".tsx", "")}"`).test(all))
        expect(dead).toEqual([])
    })
})
