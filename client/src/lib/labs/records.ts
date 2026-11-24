// Per-device lab records for the Home "Lab records" widget. Storage can be blocked: every read and write is guarded.
export const HL_BEST_KEY = "jsc.lab.higherLowerBest"
export const SLOTS_KEY = "jsc.lab.slotsTotals"

export type LabRecords = { higherLowerBest: number; spins: number; jackpots: number }

const read = (key: string): string | null => {
    try {
        return window.localStorage.getItem(key)
    } catch {
        return null
    }
}

export function readSlotTotals(): { spins: number; jackpots: number } {
    try {
        const v = JSON.parse(read(SLOTS_KEY) ?? "{}") as { spins?: unknown; jackpots?: unknown }
        return { spins: Number(v.spins) > 0 ? Math.floor(Number(v.spins)) : 0, jackpots: Number(v.jackpots) > 0 ? Math.floor(Number(v.jackpots)) : 0 }
    } catch {
        return { spins: 0, jackpots: 0 }
    }
}

/** Add one spin (and a jackpot when it hit) to the lifetime totals. */
export function recordSpin(jackpot: boolean): void {
    const t = readSlotTotals()
    try {
        window.localStorage.setItem(SLOTS_KEY, JSON.stringify({ spins: t.spins + 1, jackpots: t.jackpots + (jackpot ? 1 : 0) }))
    } catch {
        // storage unavailable: the records just stay at what they were
    }
}

export const readLabRecords = (): LabRecords => ({ higherLowerBest: Number(read(HL_BEST_KEY)) || 0, ...readSlotTotals() })
/** True once the member has played any lab. */
export const hasLabRecords = (r: LabRecords): boolean => r.higherLowerBest > 0 || r.spins > 0
