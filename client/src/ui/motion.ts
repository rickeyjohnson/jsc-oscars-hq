export const spring = {
    snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 },
    sheet: { type: "spring", stiffness: 380, damping: 36 },
    page: { type: "spring", stiffness: 300, damping: 32 },
    podium: { type: "spring", stiffness: 180, damping: 18 },
} as const
export const fade = { duration: 0.18, ease: "easeOut" } as const
export const PRESS_SCALE = 0.97
