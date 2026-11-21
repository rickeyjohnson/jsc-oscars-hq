import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../supabaseClient", () => ({ supabase: { auth: { signInWithOAuth: vi.fn() } } }))

import { googleAuthEnabled } from "./googleAuth"

describe("googleAuthEnabled", () => {
    afterEach(() => vi.unstubAllEnvs())

    it("is off when neither flag is set", () => {
        vi.stubEnv("VITE_GOOGLE_LOGIN", "")
        vi.stubEnv("VITE_GOOGLE_AUTH", "")
        expect(googleAuthEnabled()).toBe(false)
    })

    it("turns on with VITE_GOOGLE_LOGIN=true (the name Vercel accepts)", () => {
        vi.stubEnv("VITE_GOOGLE_LOGIN", "true")
        vi.stubEnv("VITE_GOOGLE_AUTH", "")
        expect(googleAuthEnabled()).toBe(true)
    })

    it("still turns on with the older VITE_GOOGLE_AUTH=true", () => {
        vi.stubEnv("VITE_GOOGLE_LOGIN", "")
        vi.stubEnv("VITE_GOOGLE_AUTH", "true")
        expect(googleAuthEnabled()).toBe(true)
    })

    it("only the exact string true counts", () => {
        vi.stubEnv("VITE_GOOGLE_LOGIN", "1")
        vi.stubEnv("VITE_GOOGLE_AUTH", "yes")
        expect(googleAuthEnabled()).toBe(false)
    })
})
