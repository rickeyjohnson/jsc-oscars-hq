// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import { CompareChart, DotStrip, ExpectedChart, NomsWinsChart, Sparkline, TrendChart } from "../charts/StatsCharts"
import { buildModel, expectedWins, groupRates, rateSeries } from "../../lib/statsLab"

afterEach(cleanup)

const members = [{ id: "a", name: "Ann" }, { id: "b", name: "Bo" }]
const r = (l: string, o: number, id: string, noms: number, wins: number) => ({ season_label: l, season_order: o, member_id: id, noms, wins })
// Ann is in Fall 23 (slide count), skips Spring 24, is back in Fall 24 and Spring 25.
const m = buildModel({ rows: [r("Fall 23", 0, "a", 8, 2), r("Fall 23", 0, "b", 8, 1), r("Spring 24", 1, "b", 6, 3), r("Fall 24", 2, "a", 6, 3), r("Fall 24", 2, "b", 6, 2), r("Spring 25", 3, "a", 10, 4), r("Spring 25", 3, "b", 10, 5)], members })

describe("NomsWinsChart", () => {
    it("is an image with a summary and a hidden table; a gap is a dash, never a zero; slide counts have a tilde", () => {
        render(<NomsWinsChart sems={m.sems} cells={m.cells.a} pebble="sky" name="Ann" />)
        const img = screen.getByRole("img")
        expect(img.getAttribute("aria-label")).toMatch(/Ann: nominations and wins in each of 4 semesters/)
        expect(img.getAttribute("aria-label")).toMatch(/Spring 24 not in/)
        const rows = within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true }).map((x) => x.textContent)
        expect(rows).toContain("Fall 23~82")
        expect(rows).toContain("Spring 24——")
        expect(rows).toContain("Fall 24~63")
        expect(img.querySelectorAll("rect").length).toBe(6) // 3 semesters x (noms + wins)
    })
    it("paints the wins in the member's pebble class, with no raw colors", () => {
        const { container } = render(<NomsWinsChart sems={m.sems} cells={m.cells.a} pebble="grape" name="Ann" />)
        expect(container.querySelector(".fill-pebble-grape")).toBeTruthy()
        expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i)
    })
})

describe("TrendChart", () => {
    it("draws one line per unbroken run and no line across the gap", () => {
        const { container } = render(<TrendChart sems={m.sems} series={rateSeries(m, "a")} group={groupRates(m).map((g) => (g === null ? null : g * 100))} pebble="lime" name="Ann" />)
        // Ann: F23, gap, F24, S25 -> a lone point (no line) and a 2-point run; plus the dashed group line
        expect(container.querySelectorAll("polyline").length).toBe(2)
        expect(container.querySelectorAll("polyline.stroke-label-2").length).toBe(1)
        expect(container.querySelectorAll("circle").length).toBe(3)
        expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/Spring 24 —/)
    })
})

describe("ExpectedChart", () => {
    it("labels the gap between actual and expected, signed", () => {
        render(<ExpectedChart sems={m.sems} rows={expectedWins(m, "a").perSem} pebble="cherry" name="Ann" />)
        const label = screen.getByRole("img").getAttribute("aria-label")!
        expect(label).toMatch(/Fall 23 2 won, 1\.5 expected/)
        expect(label).toMatch(/Spring 24 not in/)
        const rows = within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true })
        expect(rows[2].textContent).toBe("Spring 24———")
    })
})

describe("DotStrip", () => {
    const values = { a: 3, b: 5, c: 5, d: 9 }
    it("marks this member among everyone and lists all in the hidden table", () => {
        const { container } = render(<DotStrip values={values} meId="b" pebble="sky" fmt={(v) => `${v} wins`} label="Wins" names={{ a: "Ann", b: "Bo", c: "Cy", d: "Di" }} />)
        expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Wins: Bo at 5 wins among 4 members, from 3 wins to 9 wins.")
        expect(container.querySelectorAll("circle").length).toBe(4)
        expect(container.querySelectorAll(".fill-pebble-sky").length).toBe(1)
        expect(within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true })).toHaveLength(5)
    })
})

describe("Sparkline", () => {
    it("a lone point is a dot, gaps split lines", () => {
        const { container } = render(<Sparkline series={[10, null, 20, 30, null, 40]} pebble="lime" label="trend" />)
        expect(container.querySelectorAll("polyline").length).toBe(1)
        expect(container.querySelectorAll("circle").length).toBe(2)
        expect(screen.getByRole("img", { name: "trend" })).toBeTruthy()
    })
    it("renders nothing drawn for no data", () => {
        const { container } = render(<Sparkline series={[null, null]} pebble="lime" label="none" />)
        expect(container.querySelectorAll("polyline,circle").length).toBe(0)
    })
})

describe("CompareChart", () => {
    it("leaves out the bar of a semester one was not in, and tables both", () => {
        const series = m.sems.map((_, i) => ({ a: rateSeries(m, "a")[i], b: rateSeries(m, "b")[i] }))
        const { container } = render(<CompareChart sems={m.sems} series={series} a={{ name: "Ann", pebble: "sky" }} b={{ name: "Bo", pebble: "sky" }} />)
        expect(container.querySelectorAll("rect").length).toBe(7) // Ann 3, Bo 4
        expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/^Ann against Bo/)
        expect(within(screen.getByRole("table", { hidden: true })).getAllByRole("row", { hidden: true })).toHaveLength(5)
    })
})

describe("phone overflow guard", () => {
    it("the hidden data table sits inside an .sr-only wrapper (a bare sr-only table ignores width/overflow and widens the page)", () => {
        render(<NomsWinsChart sems={m.sems} cells={m.cells.a} pebble="sky" name="Ann" />)
        const table = screen.getByRole("table", { hidden: true })
        expect(table.className).not.toMatch(/sr-only/)
        expect(table.parentElement?.className).toMatch(/sr-only/)
    })
})
