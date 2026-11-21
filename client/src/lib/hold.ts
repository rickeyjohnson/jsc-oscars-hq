// Press-and-hold to confirm, as a pure reducer. The UI feeds pointer events (and keyboard
// Space/Enter as a synthetic pointer: keydown -> down, keyup -> up, blur -> cancel) plus
// timer ticks; it owns no timing logic of its own.
export const HOLD_MS = 3000
export const MOVE_TOLERANCE_PX = 10

export type HoldState = { phase: "idle" | "holding" | "done"; startedAt: number | null; pointerId: number | null; x: number; y: number }
export type HoldEvent =
    | { type: "down"; t: number; pointerId: number; x: number; y: number }
    | { type: "move"; pointerId: number; x: number; y: number }
    | { type: "up"; pointerId: number }
    | { type: "cancel" }
    | { type: "tick"; t: number }

export const HOLD_IDLE: HoldState = { phase: "idle", startedAt: null, pointerId: null, x: 0, y: 0 }

export function holdReducer(s: HoldState, e: HoldEvent): HoldState {
    if (s.phase === "done") return s
    if (e.type === "cancel") return s.phase === "idle" ? s : HOLD_IDLE
    if (s.phase === "idle") {
        if (e.type === "down") return { phase: "holding", startedAt: e.t, pointerId: e.pointerId, x: e.x, y: e.y }
        return s
    }
    // holding
    switch (e.type) {
        case "down":
            return e.pointerId === s.pointerId ? s : HOLD_IDLE // a second finger cancels
        case "move":
            if (e.pointerId !== s.pointerId) return s
            return Math.hypot(e.x - s.x, e.y - s.y) > MOVE_TOLERANCE_PX ? HOLD_IDLE : s
        case "up":
            return e.pointerId === s.pointerId ? HOLD_IDLE : s
        case "tick":
            return s.startedAt !== null && e.t - s.startedAt >= HOLD_MS ? { ...s, phase: "done" } : s
    }
}

export function holdProgress(s: HoldState, now: number): number {
    if (s.phase === "done") return 1
    if (s.phase === "idle" || s.startedAt === null) return 0
    return Math.min(1, Math.max(0, (now - s.startedAt) / HOLD_MS))
}
