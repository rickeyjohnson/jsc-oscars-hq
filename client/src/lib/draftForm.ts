import type { BallotDetail, BallotFormData } from "../types"
import { toLocalInput } from "./time"

// A saved draft back into the builder's form (times shown in local time).
export const detailToForm = (d: BallotDetail): BallotFormData => ({
    season_id: d.season_id,
    name: d.name,
    opens_at: toLocalInput(d.opens_at),
    closes_at: toLocalInput(d.closes_at),
    categories: d.categories.map((c) => ({ ...c, nominees: c.nominees.map((n) => ({ ...n })) })),
})

// What the leave-the-page guard compares: unsaved work exists when the form differs from the last saved/loaded one.
export const formKey = (f: BallotFormData): string => JSON.stringify(f)
export const isDirty = (current: BallotFormData, saved: BallotFormData): boolean => formKey(current) !== formKey(saved)
