import { describe, expect, it } from "vitest"
import { authRedirectUrl } from "./siteUrl"

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
