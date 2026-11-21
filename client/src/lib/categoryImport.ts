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
    const csvMode = first !== undefined && first.trim().toLowerCase().startsWith("name,description")

    let raw: ImportedCategory[]
    if (csvMode) {
        raw = parseCsv(text)
            .slice(1)
            .map((r) => ({ name: (r[0] ?? "").trim(), description: (r[1] ?? "").trim() }))
    } else {
        raw = lines.map((l) => {
            const idx = l.indexOf("|")
            return idx === -1
                ? { name: l.trim(), description: "" }
                : { name: l.slice(0, idx).trim(), description: l.slice(idx + 1).trim() }
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
