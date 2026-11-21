import { describe, expect, it } from "vitest"
import { displayName } from "./displayName"

describe("displayName (P1-10)", () => {
    it("prefers the claimed member name over an email-prefix username", () => {
        expect(displayName({ name: "Kadin" }, { display_name: "kadin.x", username: "kadin.x" })).toBe("Kadin")
    })
    it("falls back to display_name, then username, then empty", () => {
        expect(displayName(null, { display_name: "Kay", username: "k" })).toBe("Kay")
        expect(displayName(null, { display_name: "", username: "k" })).toBe("k")
        expect(displayName(null, null)).toBe("")
    })
})
