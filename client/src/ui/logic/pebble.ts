import { PEBBLE_COLORS, type PebbleName } from "../tokens"
import { contrastRatio } from "./contrast"

export const PEBBLES: PebbleName[] = ["strawberry", "cherry", "tangerine", "lemon", "lime", "sky", "grape"]
export const SMALL_TEXT_OK: PebbleName[] = PEBBLES.filter((n) => contrastRatio(PEBBLE_COLORS[n].on, PEBBLE_COLORS[n].bg) >= 4.5)
export const HERO_EXCLUDE: PebbleName[] = ["lemon"]
export const RESULTS_EXCLUDE: PebbleName[] = ["lemon", "tangerine"]
export const STATUS_PEBBLE = {
    open: "lime",
    upcoming: "sky",
    voted: "strawberry",
    submitted: "strawberry",
    released: "lemon",
    closed: null,
    draft: null,
} as const

export type PebbleOpts = { exclude?: PebbleName[]; smallText?: boolean }

function allowed(opts?: PebbleOpts): PebbleName[] {
    return PEBBLES.filter((n) => !opts?.exclude?.includes(n) && !(opts?.smallText && !SMALL_TEXT_OK.includes(n)))
}

function fnv1a(key: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
}

export function pebbleFor(key: string, opts?: PebbleOpts): PebbleName {
    const list = allowed(opts)
    if (list.length === 0) return "strawberry"
    return list[fnv1a(key) % list.length]
}

export function pebbleAt(index: number, opts?: PebbleOpts): PebbleName {
    const list = allowed(opts)
    if (list.length === 0) return "strawberry"
    const n = list.length
    return list[((index % n) + n) % n]
}

// Literal strings so Tailwind's scanner sees every class.
export const PEBBLE_CLASS: Record<PebbleName, { bg: string; text: string }> = {
    strawberry: { bg: "bg-pebble-strawberry", text: "text-on-pebble-strawberry" },
    cherry: { bg: "bg-pebble-cherry", text: "text-on-pebble-cherry" },
    tangerine: { bg: "bg-pebble-tangerine", text: "text-on-pebble-tangerine" },
    lemon: { bg: "bg-pebble-lemon", text: "text-on-pebble-lemon" },
    lime: { bg: "bg-pebble-lime", text: "text-on-pebble-lime" },
    sky: { bg: "bg-pebble-sky", text: "text-on-pebble-sky" },
    grape: { bg: "bg-pebble-grape", text: "text-on-pebble-grape" },
}

// 4px left edge for dark info cards. Literal strings for Tailwind's scanner.
export const PEBBLE_EDGE: Record<PebbleName, string> = {
    strawberry: "border-pebble-strawberry",
    cherry: "border-pebble-cherry",
    tangerine: "border-pebble-tangerine",
    lemon: "border-pebble-lemon",
    lime: "border-pebble-lime",
    sky: "border-pebble-sky",
    grape: "border-pebble-grape",
}

// Selected card: the face turns ink with the letter in the card's pebble. Literal strings for Tailwind's scanner.
export const PEBBLE_INK_FACE: Record<PebbleName, string> = {
    strawberry: "bg-on-pebble-strawberry text-pebble-strawberry",
    cherry: "bg-on-pebble-cherry text-pebble-cherry",
    tangerine: "bg-on-pebble-tangerine text-pebble-tangerine",
    lemon: "bg-on-pebble-lemon text-pebble-lemon",
    lime: "bg-on-pebble-lime text-pebble-lime",
    sky: "bg-on-pebble-sky text-pebble-sky",
    grape: "bg-on-pebble-grape text-pebble-grape",
}
