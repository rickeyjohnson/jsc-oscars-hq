import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const html = readFileSync(join(__dirname, "../../index.html"), "utf8")

describe("share card meta", () => {
    it("declares a large twitter card and og image tags", () => {
        expect(html).toContain('name="twitter:card" content="summary_large_image"')
        expect(html).toMatch(/property="og:image" content="%SITE_URL%\/og-image\.png"/)
        expect(html).toMatch(/name="twitter:image" content="%SITE_URL%\/og-image\.png"/)
        expect(html).toContain('property="og:image:width" content="1200"')
        expect(html).toContain('property="og:image:height" content="630"')
    })
    it("ships the image", () => {
        expect(existsSync(join(__dirname, "../../public/og-image.png"))).toBe(true)
    })
})
