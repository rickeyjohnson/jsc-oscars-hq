export type PastStatRow = { season_label: string; season_order: number; member_id: string; noms: number; wins: number }
export type Semester = { label: string; order: number }

/** Semesters in chronological order (season_order, then label). */
export function semesters(rows: PastStatRow[]): Semester[] {
    const seen = new Map<string, number>()
    for (const r of rows) if (!seen.has(r.season_label)) seen.set(r.season_label, r.season_order)
    return [...seen].map(([label, order]) => ({ label, order })).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
}
