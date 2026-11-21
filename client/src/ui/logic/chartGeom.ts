// Small pure helpers for the hand-built SVG charts.

/** Round a maximum up to a multiple of `step` (at least one step) so the axis has room. */
export const niceMax = (v: number, step: number): number => Math.max(step, Math.ceil(v / step) * step)

/** Whole-number axis ticks from 0 to max, at most `count` + 1 of them, no repeats. */
export function ticks(max: number, count = 3): number[] {
    return [...new Set(Array.from({ length: count + 1 }, (_, k) => Math.round((max / count) * k)))]
}

/** Runs of consecutive non-null values as [index, value] pairs: a line is drawn per run, never across a gap. */
export function runs(values: (number | null)[]): [number, number][][] {
    const out: [number, number][][] = []
    let cur: [number, number][] = []
    values.forEach((v, i) => {
        if (v === null) {
            if (cur.length) out.push(cur)
            cur = []
        } else cur.push([i, v])
    })
    if (cur.length) out.push(cur)
    return out
}

/** SVG `points` for one run. */
export const polyPoints = (run: [number, number][], x: (i: number) => number, y: (v: number) => number): string => run.map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")

/** Center x of column i out of n between `left` and `left + width`. */
export const colX = (i: number, n: number, left: number, width: number): number => left + (width / n) * i + width / (2 * n)

/**
 * Dot strip layout: every value on one line from low to high. Dots that would overlap stack upward into rows.
 * Returns x (0..1 across the line) and row for each id, in ascending value order.
 */
export function stripLayout(values: Record<string, number>, width: number, gap = 9): { id: string; x: number; row: number }[] {
    const ids = Object.keys(values).sort((a, b) => values[a] - values[b] || a.localeCompare(b))
    if (ids.length === 0) return []
    const lo = values[ids[0]]
    const hi = values[ids[ids.length - 1]]
    const last: number[] = []
    return ids.map((id) => {
        const x = hi === lo ? 0.5 : (values[id] - lo) / (hi - lo)
        const px = x * width
        let row = 0
        while (last[row] !== undefined && px - last[row] < gap) row++
        last[row] = px
        return { id, x, row }
    })
}
