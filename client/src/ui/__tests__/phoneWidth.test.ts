import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const src = join(__dirname, "..", "..")
const read = (f: string) => readFileSync(join(src, f), "utf8")

// iOS Safari shrinks the whole page when anything is wider than the viewport, so these rules are guarded.
describe("phone width guards", () => {
    it("sr-only text wraps and is paint-contained so it can't widen the layout viewport", () => {
        const css = read("index.css")
        expect(css).toMatch(/\.sr-only\s*\{[^}]*white-space:\s*normal[^}]*contain:\s*paint/s)
    })
    it("chart figures clip their overflow", () => {
        expect(read("ui/charts/StatsCharts.tsx")).toMatch(/<figure className="[^"]*overflow-hidden/)
    })
    it("countdowns stay on one line and drop seconds on phones", () => {
        for (const f of ["ui/Countdown.tsx", "pages/home/widgets.tsx"]) {
            const s = read(f)
            expect(s).toMatch(/flex-nowrap[^"]*whitespace-nowrap/)
            expect(s).toMatch(/hidden [^"]*sm:inline/)
        }
    })
    it("stat cards share one equal-height grid", () => {
        expect(read("pages/stats/MemberStats.tsx")).toMatch(/auto-rows-fr/)
    })
})
