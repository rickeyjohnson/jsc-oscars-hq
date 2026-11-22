import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const pub = join(__dirname, "../../public")
const html = readFileSync(join(__dirname, "../../index.html"), "utf8")
const manifest = JSON.parse(readFileSync(join(pub, "manifest.webmanifest"), "utf8"))

// PNG width/height live in the IHDR chunk at bytes 16..24.
const pngSize = (rel: string) => {
    const buf = readFileSync(join(pub, rel))
    return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`
}

describe("app icons", () => {
    it("manifest icons exist with the declared sizes and cover any + maskable", () => {
        for (const icon of manifest.icons) {
            const rel = icon.src.replace(/^\//, "")
            expect(existsSync(join(pub, rel)), rel).toBe(true)
            expect(pngSize(rel), rel).toBe(icon.sizes)
        }
        const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose)
        expect(purposes).toContain("any")
        expect(purposes).toContain("maskable")
    })
    it("uses the brand colours and names", () => {
        expect(manifest.background_color.toLowerCase()).toBe("#18181b")
        expect(manifest.theme_color.toLowerCase()).toBe("#18181b")
        expect(manifest.name).toBe("Just Sidechatting Oscars")
        expect(manifest.short_name).toBe("JSC Oscars")
    })
    it("ships the apple touch icon and favicon at the right size", () => {
        expect(html).toContain('href="/icons/apple-touch-icon-v2.png"')
        expect(pngSize("icons/apple-touch-icon-v2.png")).toBe("180x180")
        expect(pngSize("icons/favicon-32-v3.png")).toBe("32x32")
    })
})

describe("ios splash images", () => {
    const links = [...html.matchAll(/rel="apple-touch-startup-image" href="([^"]+)"/g)].map((m) => m[1])
    it("declares the common portrait sizes", () => {
        expect(links.length).toBeGreaterThanOrEqual(5)
    })
    it("each link exists on disk and its filename matches its pixel size", () => {
        for (const href of links) {
            const rel = href.replace(/^\//, "")
            expect(existsSync(join(pub, rel)), rel).toBe(true)
            expect(rel).toContain(pngSize(rel))
        }
    })
})
