import type { DashState } from "../../lib/voting"

export const progressLabel = (voted: number, total: number): string => `${voted} of ${total} voted. Jump to a category`

// Per-dash buttons only when each dash keeps at least 20px of visual width after a 2px gap.
export const segmentsTappable = (widthPx: number, count: number): boolean => count > 0 && widthPx / count - 2 >= 20

// Strip: current = sky and taller (7px vs 5px; vertical: wider), voted = label, unvoted = faint cream.
export function dashClass(s: DashState, orientation: "horizontal" | "vertical"): string {
    const color = s.current ? "bg-pebble-sky" : s.failed ? "bg-pebble-cherry" : s.voted ? "bg-label" : "bg-strip-off"
    const size = orientation === "horizontal" ? (s.current ? "h-[7px] w-full" : "h-[5px] w-full") : s.current ? "w-[7px] h-full" : "w-[5px] h-full"
    return `block rounded-full ${color} ${size}`
}

// Submit page strip: voted = solid sky, not voted = dashed outline (no fill). Nothing else carries meaning.
export const submitDashClass = (s: DashState): string =>
    `block h-[7px] w-full rounded-full ${s.voted ? "bg-pebble-sky" : "border-2 border-dashed border-label-2"}`

export const dashAriaLabel = (i: number, label: string, s: DashState): string =>
    `Category ${i + 1}: ${label}, ${s.failed ? "couldn't save" : s.voted ? "voted" : "not voted"}${s.current ? ", current" : ""}`
