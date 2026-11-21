import { describe, expect, it } from "vitest"
import { MEMBERS } from "../../test/fixtures"
import { avatarFallback, initials } from "../logic/avatar"
import { avatarSizeClass, buttonClasses, chipClasses } from "../logic/variants"
import { PEBBLE_CLASS } from "../logic/pebble"

describe("initials", () => {
    it("handles Last, First", () => expect(initials("Nick, Rickey")).toBe("NR"))
    it("single name", () => expect(initials("anthony")).toBe("A"))
    it("blank", () => expect(initials("  ")).toBe("?"))
    it("first and last of many", () => expect(initials("Mary Jane Watson")).toBe("MW"))
})

describe("avatarFallback", () => {
    it("never grape and is stable", () => {
        for (const m of MEMBERS) {
            expect(avatarFallback(m.id)).not.toBe("grape")
            expect(avatarFallback(m.id)).toBe(avatarFallback(m.id))
        }
        expect(avatarFallback("m-Micah")).not.toBe("grape")
    })
})

describe("variants", () => {
    it("maps every avatar size", () => {
        for (const s of [24, 32, 40, 56, 72, 96] as const) expect(avatarSizeClass(s)).toMatch(/size-/)
    })
    it("maps button variants", () => {
        expect(buttonClasses({ variant: "primary" })).toContain("bg-inverse")
        expect(buttonClasses({ variant: "primary" })).toContain("text-on-inverse")
        expect(buttonClasses({ variant: "ghost" })).toContain("border-2")
        expect(buttonClasses({ variant: "link" })).toContain("text-pebble-sky")
        expect(buttonClasses({ variant: "secondary" })).toContain("bg-surface-2")
        expect(buttonClasses({ variant: "tinted" })).toContain("bg-fill")
        expect(buttonClasses({ variant: "destructive" })).toContain("text-danger")
        expect(buttonClasses({ variant: "pebble", pebble: "sky" })).toContain(PEBBLE_CLASS.sky.bg)
        expect(buttonClasses({ variant: "plain" })).not.toMatch(/(^| )bg-/)
    })
    it("maps sizes", () => {
        expect(buttonClasses({ size: "lg" })).toContain("h-14")
        expect(buttonClasses({ size: "md" })).toContain("h-11")
        expect(buttonClasses({ size: "sm" })).toContain("h-8")
    })
    it("maps chip tones through pebbles", () => {
        expect(chipClasses("sky")).toContain(PEBBLE_CLASS.sky.bg)
        expect(chipClasses("gold")).toContain("bg-gold")
        expect(chipClasses("danger")).toContain("text-danger")
        expect(chipClasses()).toContain("bg-fill")
    })
})
