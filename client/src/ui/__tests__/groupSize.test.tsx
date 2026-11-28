// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import CategoryModal from "../../pages/ballot-builder/CategoryModal"
import { ConfirmProvider } from "../ConfirmProvider"
import type { Category } from "../../types"

vi.mock("../../api/myoc", () => ({ fetchMyocWindows: () => Promise.resolve([]), fetchReviewIdeas: () => Promise.resolve([]) }))

describe("category group size", () => {
    it("keeps the chosen group size when saved", () => {
        const onSave = vi.fn()
        const initial: Category = { id: "c1", name: "Best Quartet", description: "", order: 0, nominee_mode: "group", allow_member_add: false, group_size: 2, nominees: [] }
        render(
            <ConfirmProvider>
                <CategoryModal isOpen onClose={() => {}} onSave={onSave} initialData={initial} existingCategoriesCount={1} members={[]} />
            </ConfirmProvider>,
        )
        fireEvent.click(screen.getByRole("radio", { name: "4" }))
        fireEvent.click(screen.getByRole("button", { name: "Save changes" }))
        expect(onSave.mock.calls[0][0].group_size).toBe(4)
    })
})
