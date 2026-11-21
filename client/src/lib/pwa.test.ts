import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { canApplyUpdate, isVoteRoute } from "./pwa"

describe("update policy", () => {
    it("treats vote and submit routes as unsafe to reload", () => {
        expect(isVoteRoute("/app/ballots/abc")).toBe(true)
        expect(isVoteRoute("/app/ballots/abc/submit")).toBe(true)
        expect(canApplyUpdate("/app/ballots/abc")).toBe(false)
    })
    it("allows updates elsewhere", () => {
        for (const p of ["/", "/app", "/app/ballots", "/app/results", "/app/profile"]) expect(canApplyUpdate(p)).toBe(true)
    })
})

describe("sw.js safety", () => {
    const sw = readFileSync("public/sw.js", "utf8")
    it("ignores non-GET and cross-origin requests", () => {
        expect(sw).toMatch(/req\.method !== "GET"\) return/)
        expect(sw).toMatch(/url\.origin !== self\.location\.origin\) return/)
    })
    it("never caches api/auth paths and does not skipWaiting on install", () => {
        expect(sw).toContain('"/api/"')
        expect(sw).toContain('"/auth/"')
        const install = sw.slice(sw.indexOf('"install"'), sw.indexOf('"activate"'))
        expect(install).not.toContain("skipWaiting()")
    })
    it("cleans old caches by version", () => {
        expect(sw).toContain("caches.delete")
    })
})
