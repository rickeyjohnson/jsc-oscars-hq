// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { Stepper } from "../../components/committee/Stepper"
import { NextCard } from "../../components/committee/NextCard"
import WhoVoted from "../../components/committee/WhoVoted"
import { WinnerPicker } from "../../components/committee/WinnerPicker"
import { stepperSteps } from "../../lib/ballotFlow"

vi.mock("../useMemberDirectory", () => ({ useMemberDirectory: () => [] }))
afterEach(cleanup)

describe("Stepper", () => {
    it("marks the current step and shows Tiebreak as dashed if needed", () => {
        render(<Stepper steps={stepperSteps({ phase: "closed", hasTiebreak: false, tiesNeeded: false, allDecided: false })} />)
        expect(screen.getByText("Closed").closest("li")!.getAttribute("aria-current")).toBe("step")
        expect(within(screen.getByText("Tiebreak").closest("li")!).getByText("if needed")).toBeTruthy()
    })
})

describe("NextCard", () => {
    it("shows exactly one primary button; extra actions are the caller's quiet children", () => {
        const onPrimary = vi.fn()
        render(
            <NextCard next={{ tone: "sky", heading: "H", text: "T", primary: { id: "see-left", label: "See who's left" } }} onPrimary={onPrimary}>
                <button type="button">Close now</button>
            </NextCard>,
        )
        fireEvent.click(screen.getByRole("button", { name: "See who's left" }))
        expect(onPrimary).toHaveBeenCalledWith("see-left")
        expect(screen.getByRole("heading", { name: "H" })).toBeTruthy()
    })
    it("no primary renders no primary button", () => {
        render(<NextCard next={{ tone: "sky", heading: "H", text: "T", primary: null }} onPrimary={() => {}} />)
        expect(screen.queryByRole("button")).toBeNull()
    })
})

describe("WhoVoted", () => {
    const rows = [
        { name: "Dee", voted: 0, total: 4, claimed: true },
        { name: "Ava", voted: 4, total: 4, claimed: true },
        { name: "Lou", voted: 0, total: 4, claimed: false },
    ]
    it("one list with n of N, the summary header, and a Not finished filter", () => {
        render(<WhoVoted rows={rows} />)
        expect(screen.getByText(/1 of 2 finished/)).toBeTruthy()
        expect(screen.getByText("0 of 4")).toBeTruthy()
        expect(screen.getByText("4 of 4")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /Not finished/ }))
        expect(screen.queryByText("Ava")).toBeNull()
        expect(screen.getByText("Dee")).toBeTruthy()
    })
    it("copies the names of who is left", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
        render(<WhoVoted rows={rows} ballotName="Round 1" closesAt={new Date("2026-11-29T01:00:00Z")} />)
        fireEvent.click(screen.getByRole("button", { name: "Copy reminder" }))
        await waitFor(() => expect(writeText).toHaveBeenCalled())
        const msg = writeText.mock.calls[0][0] as string
        expect(msg).toContain("Dee, you haven't voted yet on Round 1")
        expect(msg).toContain("8:00 PM ET")
        expect((await screen.findByRole("status")).textContent).toBe("Copied")
    })
    it("falls back to execCommand when the clipboard API is missing", async () => {
        Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
        const exec = vi.fn().mockReturnValue(true)
        ;(document as unknown as { execCommand: unknown }).execCommand = exec
        render(<WhoVoted rows={rows} ballotName="Round 1" closesAt={new Date("2026-11-29T01:00:00Z")} />)
        fireEvent.click(screen.getByRole("button", { name: "Copy reminder" }))
        expect((await screen.findByRole("status")).textContent).toBe("Copied")
        expect(exec).toHaveBeenCalledWith("copy")
    })
})

describe("WinnerPicker", () => {
    it("is a radio group; picking reports the nominee", () => {
        const onChange = vi.fn()
        render(<WinnerPicker label="Winner for X" options={[{ id: "n1", display_name: "Ava & Ben", type: "group", member_ids: ["a", "b"] }, { id: "n2", display_name: "Cam", type: "person", member_ids: [] }]} value="n2" onChange={onChange} />)
        expect(screen.getByRole("radio", { name: /Cam/ }).getAttribute("aria-checked")).toBe("true")
        fireEvent.click(screen.getByRole("radio", { name: /Ava & Ben/ }))
        expect(onChange).toHaveBeenCalledWith("n1")
    })
})
