import { describe, expect, it } from "vitest"
import { authRedirectUrl, resolveSiteBase } from "./siteUrl"

describe("authRedirectUrl", () => {
    it("joins path onto base", () => {
        expect(
            authRedirectUrl("/signup/confirmed", "https://jsc-oscars.vercel.app")
        ).toBe("https://jsc-oscars.vercel.app/signup/confirmed")
    })
    it("handles trailing slash on base", () => {
        expect(
            authRedirectUrl("/login/reset", "https://jsc-oscars.vercel.app/")
        ).toBe("https://jsc-oscars.vercel.app/login/reset")
    })
})

describe("resolveSiteBase", () => {
    it("uses env when set", () => {
        expect(resolveSiteBase("https://a.app", "http://localhost:5173")).toBe(
            "https://a.app"
        )
    })
    it("falls back to origin when env is empty or undefined", () => {
        expect(resolveSiteBase("", "http://localhost:5173")).toBe(
            "http://localhost:5173"
        )
        expect(resolveSiteBase(undefined, "http://localhost:5173")).toBe(
            "http://localhost:5173"
        )
    })
})
