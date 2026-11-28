import { parseCsv } from "./csv"

export type ImportedCategory = { name: string; description: string }

export function parseCategoryImport(input: string): {
    categories: ImportedCategory[]
    duplicates: string[]
}
{
    const text = input.replace(/^\uFEFF/, "")
    const lines = text.split(/\r\n|\r|\n/)
    const first = lines.find((l) => l.trim() !== "")
    const csvMode = first !== undefined && /^(name|category|categories|title)\s*,\s*description/i.test(first.trim())

    let raw: ImportedCategory[]
    if (csvMode) {
        raw = parseCsv(text)
            .slice(1)
            .map((r) => ({ name: (r[0] ?? "").trim(), description: (r[1] ?? "").trim() }))
    } else {
        raw = lines.map((l) => {
            const idx = l.indexOf("|")
            if (idx !== -1) return { name: l.slice(0, idx).trim(), description: l.slice(idx + 1).trim() }
            // No header: a line like `Best Hair,Who wore it best` is still name,description (quotes keep a comma in the name).
            if (l.includes(",")) {
                const [name = "", ...rest] = parseCsv(l)[0] ?? []
                return { name: name.trim(), description: rest.join(",").trim() }
            }
            return { name: l.trim(), description: "" }
        })
    }

    const seen = new Set<string>()
    const categories: ImportedCategory[] = []
    const duplicates: string[] = []
    for (const c of raw) {
        if (!c.name) continue
        const key = c.name.toLowerCase()
        if (seen.has(key)) duplicates.push(c.name)
        else {
            seen.add(key)
            categories.push(c)
        }
    }
    return { categories, duplicates }
}
