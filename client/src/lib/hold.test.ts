import { describe, expect, it } from "vitest"
import { HOLD_IDLE, holdProgress, holdReducer, type HoldState } from "./hold"

const down = (s: HoldState, t = 0, id = 1, x = 0, y = 0) => holdReducer(s, { type: "down", t, pointerId: id, x, y })

describe("holdReducer", () => {
  it("completes only after HOLD_MS", () => {
    expect(holdReducer(down(HOLD_IDLE), { type: "tick", t: 2999 }).phase).toBe("holding")
    expect(holdReducer(down(HOLD_IDLE), { type: "tick", t: 3000 }).phase).toBe("done")
  })
  it("reports progress", () => {
    expect(holdProgress(down(HOLD_IDLE), 1500)).toBeCloseTo(0.5)
    expect(holdProgress(down(HOLD_IDLE), 9000)).toBe(1)
    expect(holdProgress(HOLD_IDLE, 5000)).toBe(0)
  })
  it("early release cancels", () => {
    expect(holdReducer(down(HOLD_IDLE), { type: "up", pointerId: 1 })).toEqual(HOLD_IDLE)
  })
  it("a second pointer cancels (multi-touch)", () => {
    expect(down(down(HOLD_IDLE), 100, 2).phase).toBe("idle")
  })
  it("moving past the tolerance cancels; small moves do not", () => {
    expect(holdReducer(down(HOLD_IDLE), { type: "move", pointerId: 1, x: 0, y: 11 }).phase).toBe("idle")
    expect(holdReducer(down(HOLD_IDLE), { type: "move", pointerId: 1, x: 6, y: 6 }).phase).toBe("holding")
  })
  it("cancel resets a hold", () => {
    expect(holdReducer(down(HOLD_IDLE), { type: "cancel" })).toEqual(HOLD_IDLE)
  })
  it("done ignores everything", () => {
    const done = holdReducer(down(HOLD_IDLE), { type: "tick", t: 3000 })
    expect(holdReducer(done, { type: "cancel" }).phase).toBe("done")
    expect(holdReducer(done, { type: "up", pointerId: 1 }).phase).toBe("done")
  })
  it("ignores events from other pointers and idle ticks", () => {
    const h = down(HOLD_IDLE)
    expect(holdReducer(h, { type: "up", pointerId: 7 })).toBe(h)
    expect(holdReducer(h, { type: "move", pointerId: 7, x: 99, y: 99 })).toBe(h)
    expect(holdReducer(HOLD_IDLE, { type: "tick", t: 5000 })).toBe(HOLD_IDLE)
  })
})
