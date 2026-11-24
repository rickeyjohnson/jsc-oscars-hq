import type { StatsModel } from "../statsLab"

/** One trophy on the shelf. Wins come from the stats; a name comes from an award the member added. */
export type Trophy = { key: string; semester: string; award: string | null; awardId: string | null }
export type AwardRow = { id: string; member_id: string; semester: string; award: string }

export const PER_SHELF = 5

/**
 * Newest semester first. For each semester: its named awards first, then one unnamed trophy per remaining win.
 * An award added for a semester the stats do not cover (or beyond its win count) still gets its own trophy.
 */
export function buildShelf(model: StatsModel, memberId: string, awards: AwardRow[]): Trophy[] {
    const mine = awards.filter((a) => a.member_id === memberId)
    const out: Trophy[] = []
    const used = new Set<string>()
    const cells = model.cells[memberId] ?? []
    for (let k = model.sems.length - 1; k >= 0; k--) {
        const label = model.sems[k].label
        const wins = cells[k]?.wins ?? 0
        const named = mine.filter((a) => a.semester === label)
        named.forEach((a) => {
            used.add(a.id)
            out.push({ key: a.id, semester: label, award: a.award, awardId: a.id })
        })
        for (let i = 0; i < Math.max(0, wins - named.length); i++) out.push({ key: `${label}-${i}`, semester: label, award: null, awardId: null })
    }
    for (const a of mine) if (!used.has(a.id)) out.push({ key: a.id, semester: a.semester, award: a.award, awardId: a.id })
    return out
}

export const chunk = <T,>(list: T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size))
