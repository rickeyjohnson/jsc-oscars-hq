import type { DashState } from "../../lib/voting"

export const progressLabel = (voted: number, total: number): string => `${voted} of ${total} voted. Jump to a category`

// Per-dash buttons only when each dash keeps at least 20px of visual width after a 2px gap.
export const segmentsTappable = (widthPx: number, count: number): boolean => count > 0 && widthPx / count - 2 >= 20

// Cream strip: voted = label, unvoted = faint cream, current = taller (8px vs 4px; vertical: wider).
export function dashClass(s: DashState, orientation: "horizontal" | "vertical"): string {
    const color = s.voted ? "bg-label" : "bg-strip-off"
    const size = orientation === "horizontal" ? (s.current ? "h-2 w-full" : "h-1 w-full") : s.current ? "w-2 h-full" : "w-1 h-full"
    return `block rounded-full ${color} ${size} ${s.current ? "outline outline-1 outline-offset-2 outline-label" : ""}`.trim()
}

export const dashAriaLabel = (i: number, label: string, s: DashState): string =>
    `Category ${i + 1}: ${label}, ${s.voted ? "voted" : "not voted"}${s.current ? ", current" : ""}`
