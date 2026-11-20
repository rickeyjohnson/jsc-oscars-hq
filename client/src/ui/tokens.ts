// Single source of truth for color values. index.css mirrors these (tested in tokensCss.test.ts).
export const COLORS = {
    bg: "#18181B",
    surface: "#27272A",
    "surface-2": "#3F3F46",
    elevated: "#2C2C31",
    label: "#FFFADD",
    "label-2": "rgb(255 250 221 / .68)",
    "label-3": "rgb(255 250 221 / .40)",
    fill: "rgb(255 250 221 / .10)",
    sep: "rgb(255 250 221 / .12)",
    "strip-off": "rgb(255 250 221 / .20)",
    inverse: "#FFFADD",
    "on-inverse": "#18181B",
    accent: "#E6C77A",
    "on-accent": "#1A1304",
    danger: "#FF7A73",
    success: "#30D158",
    warn: "#FFB340",
    "lime-deep": "#4FA832",
    gold: "#FFC23D",
    "on-gold": "#3B2A00",
    silver: "#9DB4D0",
    "on-silver": "#17263A",
    bronze: "#E8803A",
    "on-bronze": "#2B1204",
} as const

export const PEBBLE_COLORS = {
    strawberry: { bg: "#FF4F9A", on: "#1A1204" },
    cherry: { bg: "#FF5148", on: "#1A1204" },
    tangerine: { bg: "#FF8A3D", on: "#1A1204" },
    lemon: { bg: "#FFD23F", on: "#1A1204" },
    lime: { bg: "#7ED957", on: "#1A1204" },
    sky: { bg: "#3DB8FF", on: "#1A1204" },
    grape: { bg: "#8B5CF6", on: "#1A1204" },
} as const

export type PebbleName = keyof typeof PEBBLE_COLORS

// fg/bg are token names, "pebble:<name>" or "on:<name>".
export type ContrastPair = { fg: string; bg: string; min: 3 | 4.5; expect: number; note?: string }

const PEBBLE_NAMES = Object.keys(PEBBLE_COLORS) as PebbleName[]
const ON_EXPECT = [6.04, 5.76, 7.91, 12.84, 10.55, 8.39, 4.38]
const BLOCK_EXPECT = [5.77, 5.5, 7.55, 12.27, 10.08, 8.01, 4.18]

export const CONTRAST_PAIRS: ContrastPair[] = [
    ...(["bg", "surface", "surface-2", "elevated"] as const).flatMap((bg, i) => [
        { fg: "label", bg, min: 4.5 as const, expect: [16.85, 14.16, 9.93, 13.21][i] },
        { fg: "label-2", bg, min: 4.5 as const, expect: [8.28, 7.34, 5.6, 6.97][i] },
    ]),
    { fg: "accent", bg: "bg", min: 4.5, expect: 10.81 },
    { fg: "accent", bg: "surface", min: 4.5, expect: 9.09 },
    { fg: "accent", bg: "surface-2", min: 4.5, expect: 6.37 },
    { fg: "on-inverse", bg: "inverse", min: 4.5, expect: 16.85 },
    { fg: "danger", bg: "bg", min: 4.5, expect: 6.99 },
    { fg: "danger", bg: "surface", min: 4.5, expect: 5.88 },
    { fg: "success", bg: "surface", min: 4.5, expect: 7.37 },
    { fg: "warn", bg: "surface", min: 4.5, expect: 8.35 },
    ...PEBBLE_NAMES.map((n, i) => ({
        fg: `on:${n}`,
        bg: `pebble:${n}`,
        min: (n === "grape" ? 3 : 4.5) as 3 | 4.5,
        expect: ON_EXPECT[i],
        note: n === "grape" ? "large text only" : undefined,
    })),
    ...PEBBLE_NAMES.map((n, i) => ({ fg: `pebble:${n}`, bg: "bg", min: 3 as const, expect: BLOCK_EXPECT[i], note: "non-text" })),
    { fg: "on:lime", bg: "lime-deep", min: 4.5, expect: 6.16, note: "release hold fill" },
    { fg: "bg", bg: "pebble:lime", min: 3, expect: 10.08, note: "submit hold track vs lime" },
    { fg: "label", bg: "pebble:grape", min: 3, expect: 4.03, note: "submit hold fill, large text" },
    { fg: "label", bg: "bg", min: 3, expect: 16.85, note: "dash strip voted" },
    { fg: "on-gold", bg: "gold", min: 4.5, expect: 8.59 },
    { fg: "on-silver", bg: "silver", min: 4.5, expect: 7.18 },
    { fg: "on-bronze", bg: "bronze", min: 4.5, expect: 6.36 },
]

// Asserted separately (rejected or decorative), not in CONTRAST_PAIRS.
export const REJECTED_PAIRS = [
    { fg: "#FFFFFF", bg: "pebble:strawberry", expect: 3.07 },
    { fg: "#FFFFFF", bg: "pebble:cherry", expect: 3.22 },
    { fg: "#FFFFFF", bg: "pebble:grape", expect: 4.23 },
]
export const DECORATIVE_PAIRS = [{ fg: "strip-off", bg: "bg", expect: 1.85 }]
