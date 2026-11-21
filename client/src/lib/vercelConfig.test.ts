import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const cfg = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    rewrites: { source: string; destination: string }[]
    headers: { source: string; headers: { key: string; value: string }[] }[]
}
const cache = (source: string) => cfg.headers.find((h) => h.source === source)?.headers.find((h) => h.key === "Cache-Control")?.value

describe("vercel.json", () => {
    it("keeps the SPA rewrite and skips real files", () => {
        const r = cfg.rewrites[0]
        expect(r.destination).toBe("/index.html")
        const re = new RegExp("^" + r.source + "$")
        expect(re.test("/app/ballots")).toBe(true)
        for (const p of ["/assets/x.js", "/fonts/a.woff2", "/icons/i.png", "/sw.js", "/manifest.webmanifest"]) expect(re.test(p)).toBe(false)
    })
    it("hashed assets are immutable; entry points are never cached", () => {
        expect(cache("/assets/(.*)")).toContain("immutable")
        expect(cache("/sw.js")).toContain("no-cache")
        expect(cache("/index.html")).toBe("no-cache")
        expect(cache("/")).toBe("no-cache")
        expect(cache("/fonts/(.*)")).not.toContain("immutable") // unhashed filenames
        expect(cache("/sidechatters/(.*)")).not.toContain("immutable")
    })
})
