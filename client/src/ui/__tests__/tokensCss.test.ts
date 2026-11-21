import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { COLORS, PEBBLE_COLORS } from "../tokens"

const root = join(__dirname, "..", "..", "..")
const css = readFileSync(join(root, "src", "index.css"), "utf8")
const html = readFileSync(join(root, "index.html"), "utf8")
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
const decl = (name: string, value: string) => new RegExp(`--${esc(name)}:\\s*${esc(value)};`, "i")

describe("index.css mirrors tokens", () => {
    it("declares every color and maps it into the theme", () => {
        for (const [k, v] of Object.entries(COLORS)) {
            expect(css, k).toMatch(decl(k, v))
            expect(css, k).toContain(`--color-${k}: var(--${k})`)
        }
        for (const [k, v] of Object.entries(PEBBLE_COLORS)) {
            expect(css, k).toMatch(decl(`pebble-${k}`, v.bg))
            expect(css, k).toMatch(decl(`on-pebble-${k}`, v.on))
            expect(css, k).toContain(`--color-pebble-${k}: var(--pebble-${k})`)
            expect(css, k).toContain(`--color-on-pebble-${k}: var(--on-pebble-${k})`)
        }
    })
    it("has both backdrop-filter forms", () => {
        expect(css).toContain("-webkit-backdrop-filter")
        expect(css).toMatch(/(^|[^-])backdrop-filter/m)
    })
    it("drops old fonts and the global button scale", () => {
        for (const bad of ["fonts.googleapis", "Poppins", "WindSong", "button:active"]) expect(css).not.toContain(bad)
    })
    it("declares CG at 300, 400 and 700", () => {
        const faces = css.match(/@font-face\s*{[^}]*font-family:\s*"CG"[^}]*}/g) ?? []
        for (const w of [300, 400, 700]) expect(faces.some((f) => new RegExp(`font-weight:\\s*${w}\\b`).test(f)), String(w)).toBe(true)
    })
    it("html is mobile-safe", () => {
        expect(html).toContain("viewport-fit=cover")
        expect(html).not.toContain("maximum-scale")
        expect(html).not.toContain("user-scalable")
        expect(html).toContain('lang="en"')
    })
})
