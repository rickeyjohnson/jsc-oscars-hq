import { validateBallotForPublish } from "../../lib/ballotForm"
import type { BallotFormData, Category } from "../../types"

export type BuilderStep = "details" | "categories" | "review"
export const BUILDER_STEPS: { id: BuilderStep; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "categories", label: "Categories" },
    { id: "review", label: "Review" },
]

export function stepIssues(step: BuilderStep, form: BallotFormData): string[] {
    if (step === "details") {
        const out: string[] = []
        if (!form.name.trim()) out.push("Add a ballot name")
        if (form.opens_at && form.closes_at && !(new Date(form.closes_at).getTime() > new Date(form.opens_at).getTime())) out.push("Closing time must be after opening time")
        return out
    }
    if (step === "categories") return form.categories.length === 0 ? ["Add at least one category"] : []
    return validateBallotForPublish(form)
}

/** Moves one category and renumbers `order` 0..n-1. */
export function moveCategory(cats: Category[], from: number, to: number): Category[] {
    const next = [...cats]
    if (from < 0 || from >= next.length) return next.map((c, i) => ({ ...c, order: i }))
    const [item] = next.splice(from, 1)
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item)
    return next.map((c, i) => ({ ...c, order: i }))
}
