export function toCsvRow(cells: string[]): string {
    return cells
        .map((c) => (/[,"\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
        .join(",")
}

export function parseCsv(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let inQuotes = false
    let pending = false // true when the current row has any content
    for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (inQuotes) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    cell += '"'
                    i++
                } else inQuotes = false
            } else cell += ch
            continue
        }
        if (ch === '"') {
            inQuotes = true
            pending = true
        } else if (ch === ",") {
            row.push(cell)
            cell = ""
            pending = true
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++
            if (pending || cell !== "") {
                row.push(cell)
                rows.push(row)
            }
            row = []
            cell = ""
            pending = false
        } else {
            cell += ch
            pending = true
        }
    }
    if (pending || cell !== "") {
        row.push(cell)
        rows.push(row)
    }
    return rows
}
