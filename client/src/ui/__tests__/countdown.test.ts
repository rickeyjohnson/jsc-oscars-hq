import { describe, expect, it } from "vitest"
import { countdownView } from "../logic/countdown"

describe("countdownView", () => {
    const t = new Date("2026-12-04T21:00:00Z")
    it("states", () => {
        expect(countdownView(null, t)).toEqual({ state: "none" })
        expect(countdownView(t, new Date("2026-12-04T21:00:01Z"))).toEqual({ state: "live" })
        expect(countdownView(t, new Date("2026-11-22T16:28:53Z"))).toMatchObject({
            state: "scheduled",
            main: "12d 04h 31m",
            seconds: "07s",
            ariaLabel: "12 days 4 hours 31 minutes until Oscar night",
        })
        expect(countdownView(t, new Date("2026-12-04T15:00:00Z"))).toMatchObject({ state: "today", timeLabel: "9:00 PM" })
    })
    it("singular units", () => {
        expect(countdownView(t, new Date("2026-12-03T19:59:00Z"))).toMatchObject({ ariaLabel: "1 day 1 hour 1 minute until Oscar night" })
    })
})
