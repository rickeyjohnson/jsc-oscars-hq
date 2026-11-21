import { describe, expect, it } from "vitest"
import { loginNotice, safeReturnPath } from "./returnTo"

describe("returnTo", () => {
    it("allows in-app paths only", () => {
        expect(safeReturnPath({ from: "/app/ballots/B1?x=1" })).toBe("/app/ballots/B1?x=1")
        expect(safeReturnPath({ from: "/app" })).toBe("/app")
        expect(safeReturnPath({ from: "https://evil.test/app" })).toBe("/app")
        expect(safeReturnPath({ from: "//evil.test" })).toBe("/app")
        expect(safeReturnPath({ from: "/appx" })).toBe("/app")
        expect(safeReturnPath(null)).toBe("/app")
    })
    it("reads the notice", () => {
        expect(loginNotice({ notice: "Your session ended." })).toBe("Your session ended.")
        expect(loginNotice(undefined)).toBeNull()
    })
})
