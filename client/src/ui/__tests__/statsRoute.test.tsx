// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("/app/stats route", () => {
    it("redirects to the leaderboard segment", () => {
        const app = readFileSync(join(__dirname, "..", "..", "App.tsx"), "utf8")
        expect(app).toMatch(/path="stats"[^\n]*Navigate to="\/app\/results\?view=leaderboard" replace/)
        expect(app).not.toMatch(/\bStatsPage\b/)
    })
    it("keeps the old Previous Oscars path alive as a redirect, and adds the read-only member route", () => {
        const app = readFileSync(join(__dirname, "..", "..", "App.tsx"), "utf8")
        expect(app).toMatch(/path="results\/previous"[^\n]*Navigate to="\/app\/results\?view=leaderboard" replace/)
        expect(app).toMatch(/path="results\/members\/:memberId"/)
        expect(app).not.toMatch(/PreviousOscarsPage/)
    })
})
