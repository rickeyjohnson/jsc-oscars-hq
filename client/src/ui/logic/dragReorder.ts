import type { WidgetId } from "./homeWidgets"
import type { HomePrefs } from "./homePrefs"

export type RowRect = { top: number; height: number }

/** Gap (0..n) where a dragged row would land: the number of rows whose midpoint is above the pointer. */
export function dropIndex(rowRects: readonly RowRect[], pointerY: number): number {
    let n = 0
    for (const r of rowRects) if (r.top + r.height / 2 < pointerY) n++
    return n
}

/** Moves item `from` into gap `gap` (a gap index in the original list). */
export function moveToGap<T>(list: readonly T[], from: number, gap: number): T[] {
    const out = [...list]
    if (from < 0 || from >= out.length) return out
    const [item] = out.splice(from, 1)
    out.splice(gap > from ? gap - 1 : gap, 0, item)
    return out
}

/** Writes a new arrangement of `group` into the slots it already occupies in the full order. */
export function applyGroupOrder(p: HomePrefs, group: readonly WidgetId[], next: readonly WidgetId[]): HomePrefs {
    const slots = new Set(group)
    let i = 0
    return { ...p, order: p.order.map((id) => (slots.has(id) ? next[i++] : id)) }
}

/** Pixels to scroll per tick while dragging: negative near the top edge, positive near the bottom, 0 elsewhere. */
export function edgeScrollSpeed(pointerY: number, top: number, bottom: number, zone = 40, max = 14): number {
    if (pointerY < top + zone) return -Math.round((max * Math.min(zone, top + zone - pointerY)) / zone)
    if (pointerY > bottom - zone) return Math.round((max * Math.min(zone, pointerY - (bottom - zone))) / zone)
    return 0
}
