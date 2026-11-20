import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { parseResultsTab } from "../logic/resultsTab"

const read = (p: string) => readFileSync(join(__dirname, "..", "..", "..", p), "utf8")

describe("parseResultsTab", () => {
    it("reads ?view=", () => {
        expect(parseResultsTab("?view=leaderboard")).toBe("leaderboard")
        expect(parseResultsTab("")).toBe("winners")
        expect(parseResultsTab("?view=nonsense")).toBe("winners")
        expect(parseResultsTab("?view=winners")).toBe("winners")
    })
})

describe("results page source", () => {
    it("keeps the release gate", () => {
        expect(read("src/pages/ResultsPage.tsx")).toMatch(/results_released_at/)
    })
})
