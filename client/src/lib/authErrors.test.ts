import { describe, it, expect } from "vitest"
import { loginErrorText, signupErrorText } from "./authErrors"

describe("loginErrorText", () => {
    it("maps invalid credentials", () => {
        expect(loginErrorText("Invalid login credentials")).toBe("Incorrect email or password.")
    })
    it("passes other messages through", () => {
        expect(loginErrorText("Email rate limit exceeded")).toBe("Email rate limit exceeded")
    })
})

describe("signupErrorText", () => {
    it("maps name-claim failures", () => {
        const claimed = "That name is already claimed or not on the list."
        expect(signupErrorText("Member name not available")).toBe(claimed)
        expect(signupErrorText("Database error saving new user")).toBe(claimed)
    })
    it("passes other messages through", () => {
        expect(signupErrorText("Password should be at least 6 characters.")).toBe("Password should be at least 6 characters.")
    })
})
