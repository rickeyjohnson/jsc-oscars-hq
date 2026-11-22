import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { COLORS, PEBBLE_COLORS } from "../tokens"

const pub = join(__dirname, "..", "..", "..", "public")
const read = (f: string) => readFileSync(join(pub, f))
const png = (f: string) => {
    const b = read(f)
    expect(b.subarray(1, 4).toString()).toBe("PNG")
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }
}

describe("manifest", () => {
    const m = JSON.parse(read("manifest.webmanifest").toString())
    it("matches the brand and tokens", () => {
        expect(m.name).toBe("Just Sidechatting Oscars")
        expect(m.display).toBe("standalone")
        expect(m.start_url).toBe("/app")
        expect(m.theme_color).toBe(COLORS.bg)
        expect(m.background_color).toBe(COLORS.bg)
    })
    it("lists 192, 512 and a maskable icon that exist", () => {
        const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`)
        expect(sizes).toEqual(["192x192:any", "512x512:any", "512x512:maskable"])
        for (const i of m.icons) {
            const d = png(i.src.slice(1))
            expect(`${d.w}x${d.h}`).toBe(i.sizes)
        }
    })
})

describe("icons", () => {
    it("has the expected PNG sizes, apple icon opaque", () => {
        expect(png("icons/apple-touch-icon-v2.png")).toMatchObject({ w: 180, h: 180 })
        expect(png("icons/favicon-32-v2.png")).toMatchObject({ w: 32, h: 32 })
    })
    it("icon.svg only uses brand colors", () => {
        const allowed = [COLORS.bg, COLORS.label, PEBBLE_COLORS.lemon.bg].map((c) => c.toLowerCase())
        const found = (read("icons/icon.svg").toString().match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((c) => c.toLowerCase())
        expect(found.length).toBeGreaterThan(0)
        for (const c of found) expect(allowed).toContain(c)
    })
})

describe("index.html", () => {
    const html = readFileSync(join(pub, "..", "index.html"), "utf8")
    it("has PWA, iOS and share metadata", () => {
        for (const s of [
            'rel="manifest"',
            'rel="apple-touch-icon"',
            `name="theme-color" content="${COLORS.bg}"`,
            "viewport-fit=cover",
            'content="black-translucent"',
            'name="apple-mobile-web-app-capable"',
            'property="og:title"',
            'name="description"',
        ])
            expect(html).toContain(s)
    })
})
