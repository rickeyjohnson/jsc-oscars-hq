// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

type Listener = (event: string, session: { user: { id: string } } | null) => void
let listener: Listener = () => {}
vi.mock("../../supabaseClient", () => ({
    supabase: {
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
            onAuthStateChange: (cb: Listener) => {
                listener = cb
                return { data: { subscription: { unsubscribe() {} } } }
            },
        },
    },
}))

import { AuthProvider } from "../../context/AuthContext"
import { cacheGet, cacheSet, cacheClearAll } from "../../lib/cache/store"
import { GLOBAL, userScope } from "../../lib/cache/keys"

beforeEach(() => {
    localStorage.clear()
    cacheClearAll()
})

describe("auth events clear the cache", () => {
    it("clears everything on SIGNED_OUT but not on other events (e.g. token refresh)", async () => {
        cacheSet(userScope("u1"), "profile", { a: 1 })
        cacheSet(GLOBAL, "members", [1])
        render(<AuthProvider>{null}</AuthProvider>)
        await waitFor(() => expect(listener).not.toBe(undefined))
        listener("TOKEN_REFRESHED", { user: { id: "u1" } })
        expect(cacheGet(userScope("u1"), "profile")).not.toBeNull()
        listener("SIGNED_OUT", null)
        expect(cacheGet(userScope("u1"), "profile")).toBeNull()
        expect(cacheGet(GLOBAL, "members")).toBeNull()
        expect(Object.keys(localStorage).filter((k) => k.startsWith("jsc.cache."))).toEqual([])
    })
    it("a different user signing in drops the previous user's scope", async () => {
        cacheSet(userScope("u1"), "profile", { a: 1 })
        render(<AuthProvider>{null}</AuthProvider>)
        await waitFor(() => expect(listener).not.toBe(undefined))
        await new Promise((r) => setTimeout(r, 0)) // let getSession record u1
        listener("SIGNED_IN", { user: { id: "u2" } })
        expect(cacheGet(userScope("u1"), "profile")).toBeNull()
    })
})
