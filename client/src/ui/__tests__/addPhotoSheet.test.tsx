// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.fn()
const update = vi.fn()
vi.mock("../../supabaseClient", () => ({
    supabase: {
        storage: { from: () => ({ upload, getPublicUrl: async () => ({ data: { publicUrl: "https://x/p.png" } }) }) },
        from: () => ({ update: (...a: unknown[]) => { update(...a); return { eq: async () => ({ error: null }) } } }),
    },
}))
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }))

import ProfileSetup from "../../components/ProfileSetup"
import BulkImportPanel from "../../pages/ballot-builder/BulkImportPanel"

beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never
    URL.createObjectURL = () => "blob:x"
    upload.mockReset().mockResolvedValue({ error: null })
    update.mockReset()
})
afterEach(() => {
    cleanup()
    vi.useRealTimers()
    document.body.style.overflow = ""
})

describe("ProfileSetup sheet", () => {
    it("stays open with no callbacks after 30s of fake time", async () => {
        vi.useFakeTimers()
        const onComplete = vi.fn()
        const onSkip = vi.fn()
        render(<ProfileSetup open onComplete={onComplete} onSkip={onSkip} />)
        expect(screen.getByRole("dialog", { name: "Add your photo" })).toBeTruthy()
        await act(async () => {
            await vi.advanceTimersByTimeAsync(30000)
        })
        expect(screen.getByRole("dialog", { name: "Add your photo" })).toBeTruthy()
        expect(onComplete).not.toHaveBeenCalled()
        expect(onSkip).not.toHaveBeenCalled()
    })

    it("Not now calls onSkip", () => {
        const onSkip = vi.fn()
        render(<ProfileSetup open onComplete={() => {}} onSkip={onSkip} />)
        fireEvent.click(screen.getByText("Not now"))
        expect(onSkip).toHaveBeenCalledTimes(1)
    })

    it("Continue is disabled until a photo is chosen, then uploads and completes", async () => {
        const onComplete = vi.fn()
        render(<ProfileSetup open onComplete={onComplete} onSkip={() => {}} />)
        const cont = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement
        expect(cont.disabled).toBe(true)
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(["a"], "me.png", { type: "image/png" })] } })
        await waitFor(() => expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false))
        fireEvent.click(screen.getByRole("button", { name: "Continue" }))
        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
        expect(update).toHaveBeenCalledWith({ image_url: "https://x/p.png" })
    })

    it("shows the upload error and stays open", async () => {
        upload.mockResolvedValue({ error: { message: "boom" } })
        const onComplete = vi.fn()
        render(<ProfileSetup open onComplete={onComplete} onSkip={() => {}} />)
        const input = document.querySelector('input[type="file"]') as HTMLInputElement
        fireEvent.change(input, { target: { files: [new File(["a"], "me.png")] } })
        await waitFor(() => expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false))
        fireEvent.click(screen.getByRole("button", { name: "Continue" }))
        expect((await screen.findByRole("alert")).textContent).toBe("Couldn't upload your photo. Try again, or skip for now.")
        expect(onComplete).not.toHaveBeenCalled()
    })

    it("source has no timers", () => {
        const src = readFileSync(join(__dirname, "..", "..", "components", "ProfileSetup.tsx"), "utf8")
        expect(src).not.toMatch(/setTimeout|setInterval/)
    })
})

describe("BulkImportPanel sheet", () => {
    it("is a dialog with parse logic, Escape closes, scroll lock applied", async () => {
        const onClose = vi.fn()
        const onImport = vi.fn()
        render(<BulkImportPanel isOpen onClose={onClose} existingNames={["Best Locs"]} onImport={onImport} />)
        await screen.findByRole("dialog", { name: "Import categories" })
        expect(document.body.style.overflow).toBe("hidden")
        fireEvent.change(screen.getByLabelText("Categories to import"), { target: { value: "Best Locs | x\nMegaphone | Loudest" } })
        fireEvent.click(screen.getByRole("button", { name: "Import 2" }))
        expect(onImport).toHaveBeenCalledTimes(1)
        expect(onImport.mock.calls[0][0]).toHaveLength(1)
        expect(screen.getByText(/1 duplicate skipped/)).toBeTruthy()
        fireEvent.keyDown(document, { key: "Escape" })
        expect(onClose).toHaveBeenCalled()
    })
})
