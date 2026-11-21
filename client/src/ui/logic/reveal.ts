export type ReadStore = Pick<Storage, "getItem"> | null
export type WriteStore = Pick<Storage, "setItem"> | null

export const revealKey = (seasonId: string) => `jsc.reveal.${seasonId}`
export const envelopeKey = (seasonId: string) => `jsc.envelope.${seasonId}`
/** Bronze first, then silver, then gold. */
export const REVEAL_ORDER: (1 | 2 | 3)[] = [3, 2, 1]

export function loadOpened(storage: ReadStore, seasonId: string): Set<string> {
    try {
        const raw = storage?.getItem(revealKey(seasonId))
        if (!raw) return new Set()
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === "string")) : new Set()
    } catch {
        return new Set()
    }
}

export function saveOpened(storage: WriteStore, seasonId: string, ids: Set<string>): void {
    try {
        storage?.setItem(revealKey(seasonId), JSON.stringify([...ids]))
    } catch {
        // best-effort
    }
}

/** Unreadable storage counts as seen, so the envelope can never trap or nag anyone. */
export function hasSeenEnvelope(storage: ReadStore, seasonId: string): boolean {
    try {
        if (!storage) return true
        return storage.getItem(envelopeKey(seasonId)) === "1"
    } catch {
        return true
    }
}

export function markEnvelopeSeen(storage: WriteStore, seasonId: string): void {
    try {
        storage?.setItem(envelopeKey(seasonId), "1")
    } catch {
        // best-effort
    }
}

export function safeStorage(): Storage | null {
    try {
        return typeof window === "undefined" ? null : window.localStorage
    } catch {
        return null
    }
}
