import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const src = join(__dirname, "..", "..")
const rel = (p: string) => relative(src, p).split(sep).join("/")

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "__tests__" || name === "dev" ? [] : walk(p)
        return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : []
    })
}
const files = walk(src)
const lines = (f: string) => readFileSync(f, "utf8").split("\n")

function scan(re: RegExp, only: RegExp = /\.(tsx?|css)$/, skip: string[] = []) {
    const hits: string[] = []
    for (const f of files) {
        if (!only.test(f) || skip.includes(rel(f))) continue
        lines(f).forEach((l, i) => re.test(l) && hits.push(`${rel(f)}:${i + 1} ${l.trim()}`))
    }
    return hits
}

describe("app-wide audit", () => {
    it("has no banned patterns", () => {
        expect(scan(/\b(h-screen|min-h-screen|100vh)\b/).join("\n")).toBe("")
        expect(scan(/text-\[1[01]px\]/).join("\n")).toBe("")
        expect(scan(/window\.confirm\(/).join("\n")).toBe("")
        expect(scan(/fonts\.googleapis/).join("\n")).toBe("")
        expect(scan(/WindSong|cursive/).join("\n")).toBe("")
    })
    it("registers the service worker only through lib/pwa (production gated)", () => {
        expect(scan(/serviceWorker\.register/, /\.tsx?$/, ["lib/pwa.ts"]).join("\n")).toBe("")
        expect(readFileSync(join(src, "lib/pwa.ts"), "utf8")).toContain("import.meta.env.PROD")
    })
    it("every <img has alt", () => {
        const hits: string[] = []
        for (const f of files.filter((f) => f.endsWith(".tsx"))) {
            const text = readFileSync(f, "utf8")
            for (const m of text.matchAll(/<img\b[^>]*?(\/>|>)/gs)) if (!/\balt=/.test(m[0])) hits.push(`${rel(f)}: ${m[0].slice(0, 60)}`)
        }
        expect(hits.join("\n")).toBe("")
    })
    it("onClick on non-interactive elements carries role and tabIndex (or is an aria-hidden scrim)", () => {
        const hits: string[] = []
        for (const f of files.filter((f) => f.endsWith(".tsx"))) {
            const text = readFileSync(f, "utf8")
            for (const m of text.matchAll(/<(div|span|li|p|section|article|img|svg)\b[^>]*?\bonClick=[^>]*>/gs))
                if (!/aria-hidden="true"/.test(m[0]) && (!/role=/.test(m[0]) || !/tabIndex=/.test(m[0]))) hits.push(`${rel(f)}: ${m[0].slice(0, 70)}`)
        }
        expect(hits.join("\n")).toBe("")
    })
    it("honors reduced motion in CSS animations and transitions", () => {
        const css = readFileSync(join(src, "index.css"), "utf8")
        expect(css).toMatch(/prefers-reduced-motion/)
        expect(css).toMatch(/data-reduce-motion/)
    })
})
