import type { BallotDetail, BallotFormData, Category, Member, NomineeType } from "../types"

export type NomineeRow = { display_name: string; secondary_text: string | null; type: NomineeType; member_ids: string[] }

export const buildNomineeRows = (category: Category, members: Member[]): NomineeRow[] => {
    switch (category.nominee_mode) {
        case "everyone":
            return [...members]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => ({ display_name: m.name, secondary_text: null, type: "person" as const, member_ids: [m.id] }))
        case "subset":
        case "preset":
            return category.nominees.map((n) => ({
                display_name: n.display_name,
                secondary_text: n.secondary_text ?? null,
                type: n.type,
                member_ids: n.member_ids,
            }))
        default:
            return []
    }
}

export const validateBallotForPublish = (form: BallotFormData): string[] => {
    const errors: string[] = []
    if (!form.name.trim()) errors.push("Ballot name is required")
    if (!form.season_id) errors.push("Select a season")
    if (!(new Date(form.closes_at).getTime() > new Date(form.opens_at).getTime())) {
        errors.push("Closing time must be after opening time")
    }
    if (form.categories.length === 0) errors.push("Add at least one category")
    const seen = new Set<string>()
    for (const c of form.categories) {
        const key = c.name.trim().toLowerCase()
        if (seen.has(key)) errors.push(`Duplicate category name "${c.name}"`)
        seen.add(key)
        const needsNominees = c.nominee_mode === "subset" || (c.nominee_mode === "preset" && !c.allow_member_add)
        const names = new Set<string>()
        for (const n of buildNomineeRows(c, [])) {
            const k = n.display_name.trim().toLowerCase()
            if (names.has(k)) errors.push(`Category "${c.name}" has duplicate nominee "${n.display_name}"`)
            names.add(k)
        }
        if (needsNominees && c.nominees.length === 0) errors.push(`Category "${c.name}" needs at least one nominee`)
    }
    return errors
}

// Reasons a saved draft cannot be published (empty = ok). Same nominee rule as validateBallotForPublish.
export const publishBlockers = (d: BallotDetail): string[] => {
    const out: string[] = []
    if (!(new Date(d.closes_at).getTime() > new Date(d.opens_at).getTime())) out.push("Closing time must be after opening time")
    if (d.categories.length === 0) out.push("Add at least one category")
    for (const c of d.categories) {
        const needsNominees = c.nominee_mode === "subset" || (c.nominee_mode === "preset" && !c.allow_member_add)
        if (needsNominees && c.nominees.length === 0) out.push(`Category "${c.name}" needs at least one nominee`)
    }
    return out
}
