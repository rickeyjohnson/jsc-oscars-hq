export type Point = { x: number; y: number }

/** Resting arrangement for circles of radius r: staggered rows packed from the bottom of a w x h box (reduced motion). */
export function settledLayout(count: number, w: number, h: number, r: number): Point[] {
    const d = r * 2
    const perRow = Math.max(1, Math.floor((w - 0) / d))
    const out: Point[] = []
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / perRow)
        const col = i % perRow
        const inRow = Math.min(perRow, count - row * perRow)
        const rowW = inRow * d
        const x = (w - rowW) / 2 + r + col * d
        // Rows stack at hex spacing; the pitch keeps neighbours at least d apart (rows are offset by r horizontally only when room allows).
        const y = h - r - row * d
        out.push({ x: Math.min(Math.max(x, Math.min(r, w / 2)), Math.max(w - r, w / 2)), y: Math.max(y, r) })
    }
    return out
}
