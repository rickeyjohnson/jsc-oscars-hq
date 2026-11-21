import { describe, expect, it } from "vitest"
import { avatarSrc, resizeDimensions, safeUploadName } from "../logic/avatar"

describe("resizeDimensions", () => {
    it("fits inside the box, keeps aspect, never upscales", () => {
        expect(resizeDimensions(4000, 3000, 512)).toEqual({ width: 512, height: 384 })
        expect(resizeDimensions(3000, 4000, 512)).toEqual({ width: 384, height: 512 })
        expect(resizeDimensions(200, 100, 512)).toEqual({ width: 200, height: 100 })
        expect(resizeDimensions(0, 5, 512)).toEqual({ width: 0, height: 0 })
    })
})
describe("safeUploadName", () => {
    it("strips spaces and unicode", () => {
        expect(safeUploadName("My Photo (1).jpeg")).toBe("My-Photo-1")
        expect(safeUploadName("日本.png")).toBe("photo")
        expect(safeUploadName("é.png")).toBe("e")
    })
})
describe("avatarSrc", () => {
    const u = "https://x.supabase.co/storage/v1/object/public/profile-pics/a-1"
    it("is a no-op unless transforms are on", () => {
        expect(avatarSrc(u, 40, false)).toBe(u)
    })
    it("rewrites supabase urls at 2x when on, leaves others", () => {
        expect(avatarSrc(u, 40, true)).toBe("https://x.supabase.co/storage/v1/render/image/public/profile-pics/a-1?width=80&height=80&resize=cover&quality=70")
        expect(avatarSrc("https://other/a.png", 40, true)).toBe("https://other/a.png")
    })
})
