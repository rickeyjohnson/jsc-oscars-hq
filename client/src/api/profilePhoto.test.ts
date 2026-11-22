// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.fn()
let updateResult: { data: unknown; error: unknown }
const eq = vi.fn()
vi.mock("../supabaseClient", () => ({
    supabase: {
        storage: { from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x/${p}` } }) }) },
        from: () => ({ update: () => ({ eq: (...a: unknown[]) => { eq(...a); return { select: () => ({ maybeSingle: async () => updateResult }) } } }) }),
    },
}))

import { saveProfilePhoto } from "./profile"
import { shouldAskForPhoto } from "../lib/photoPrompt"
import { applyOverridesToMap, clearPhotoOverrides, setPhotoOverride } from "../lib/photoOverrides"
import { cacheGet, cacheSet, resetMemory } from "../lib/cache/store"
import { GLOBAL } from "../lib/cache/keys"
import { invalidateMembers } from "../lib/cache/invalidate"

const file = new File(["a"], "me.png", { type: "image/png" })
beforeEach(() => {
    upload.mockReset().mockResolvedValue({ error: null })
    eq.mockReset()
    updateResult = { data: null, error: null }
})

describe("saveProfilePhoto", () => {
    it("uploads to a unique <uid>/<ts>.<ext> path and returns the url once 1 row updated", async () => {
        updateResult = { data: { image_url: "x" }, error: null }
        upload.mockImplementation(async (path: string) => { updateResult = { data: { image_url: `https://x/${path}` }, error: null }; return { error: null } })
        const url = await saveProfilePhoto("u1", file)
        expect(url).toMatch(/^https:\/\/x\/u1\/\d+\.png$/)
        expect(upload.mock.calls[0][2]).not.toHaveProperty("upsert")
        expect(eq).toHaveBeenCalledWith("user_id", "u1")
    })
    it("throws when no profile row was updated (silent RLS miss)", async () => {
        await expect(saveProfilePhoto("u1", file)).rejects.toThrow(/Couldn't save/)
    })
    it("throws on upload or update error", async () => {
        upload.mockResolvedValue({ error: { message: "denied" } })
        await expect(saveProfilePhoto("u1", file)).rejects.toThrow(/Couldn't upload/)
        upload.mockResolvedValue({ error: null })
        updateResult = { data: null, error: { message: "x" } }
        await expect(saveProfilePhoto("u1", file)).rejects.toThrow(/Couldn't save/)
    })
})

describe("photo prompt", () => {
    it("asks only when loaded, no photo, not skipped; stops once image_url is set", () => {
        expect(shouldAskForPhoto(false, { image_url: null }, false)).toBe(true)
        expect(shouldAskForPhoto(true, { image_url: null }, false)).toBe(false)
        expect(shouldAskForPhoto(false, null, false)).toBe(false)
        expect(shouldAskForPhoto(false, { image_url: null }, true)).toBe(false)
        expect(shouldAskForPhoto(false, { image_url: "https://x/p.jpg" }, false)).toBe(false)
    })
})

describe("cache invalidation + overrides", () => {
    it("invalidateMembers drops the cached directory", () => {
        resetMemory()
        cacheSet(GLOBAL, "directory", [{ id: "m1", name: "A", photo: null }])
        expect(cacheGet(GLOBAL, "directory")).not.toBeNull()
        invalidateMembers()
        expect(cacheGet(GLOBAL, "directory")).toBeNull()
    })
    it("overrides win over a stale fetched map", () => {
        clearPhotoOverrides()
        setPhotoOverride("m1", "new.jpg")
        expect(applyOverridesToMap({ m1: null, m2: "b.jpg" })).toEqual({ m1: "new.jpg", m2: "b.jpg" })
        clearPhotoOverrides()
    })
})
