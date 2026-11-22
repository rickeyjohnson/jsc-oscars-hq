import { CACHE_VERSION, PREFIX } from "./keys"

export type Envelope<T = unknown> = { v: number; at: number; scope: string; data: T }

const MAX_CHARS = 500_000
const mem = new Map<string, Envelope>()
let storage: Storage | null | undefined

const ls = (): Storage | null => {
    if (storage !== undefined) return storage
    try {
        storage = typeof window !== "undefined" ? window.localStorage : null
    } catch {
        storage = null
    }
    return storage
}
/** Tests inject a fake (or null to force memory-only). */
export const setStorage = (s: Storage | null | undefined): void => {
    storage = s
}

const fullKey = (scope: string, key: string) => `${PREFIX}v${CACHE_VERSION}.${scope}.${key}`

export function cacheGet<T>(scope: string, key: string): Envelope<T> | null {
    const k = fullKey(scope, key)
    const m = mem.get(k)
    if (m) return m as Envelope<T>
    try {
        const raw = ls()?.getItem(k)
        if (!raw) return null
        const env = JSON.parse(raw) as Envelope<T>
        if (!env || env.v !== CACHE_VERSION || env.scope !== scope || typeof env.at !== "number") {
            ls()?.removeItem(k) // wrong version or scope: discard, never migrate
            return null
        }
        mem.set(k, env)
        return env
    } catch {
        return null // corrupt JSON or storage blocked
    }
}

function ourKeys(s: Storage): string[] {
    const out: string[] = []
    for (let i = 0; i < s.length; i++) {
        const k = s.key(i)
        if (k && k.startsWith(PREFIX)) out.push(k)
    }
    return out
}

function evict(s: Storage, incomingChars: number): void {
    const rows = ourKeys(s).map((k) => {
        const raw = s.getItem(k) ?? ""
        let at = 0
        try {
            at = (JSON.parse(raw) as Envelope).at ?? 0
        } catch {
            // corrupt: oldest possible
        }
        return { k, at, n: raw.length }
    })
    let total = rows.reduce((a, r) => a + r.n, 0) + incomingChars
    for (const r of rows.sort((a, b) => a.at - b.at)) {
        if (total <= MAX_CHARS) break
        s.removeItem(r.k)
        mem.delete(r.k)
        total -= r.n
    }
}

export function cacheSet<T>(scope: string, key: string, data: T, now = Date.now()): void {
    const k = fullKey(scope, key)
    const env: Envelope<T> = { v: CACHE_VERSION, at: now, scope, data }
    mem.set(k, env)
    try {
        const s = ls()
        if (!s) return
        const raw = JSON.stringify(env)
        if (raw.length > MAX_CHARS) return // too big for storage: memory only
        evict(s, raw.length)
        s.setItem(k, raw)
    } catch {
        // quota or blocked: memory only
    }
}

export function cacheDel(scope: string, key: string): void {
    const k = fullKey(scope, key)
    mem.delete(k)
    try {
        ls()?.removeItem(k)
    } catch {
        // ignore
    }
}

/** Remove every entry in one scope (e.g. "u.<uid>"). Matches any cache version. */
export function cacheClearScope(scope: string): void {
    const needle = `.${scope}.`
    for (const k of [...mem.keys()]) if (k.includes(needle)) mem.delete(k)
    try {
        const s = ls()
        if (!s) return
        for (const k of ourKeys(s)) if (k.includes(needle)) s.removeItem(k)
    } catch {
        // ignore
    }
}

/** Remove every entry whose key (not scope) starts with keyPrefix, in every scope. Key prefixes must contain no dots, e.g. "ballotdetail:". */
export function cacheDelKeyPrefix(keyPrefix: string): void {
    const needle = `.${keyPrefix}`
    for (const k of [...mem.keys()]) if (k.includes(needle)) mem.delete(k)
    try {
        const s = ls()
        if (!s) return
        for (const k of ourKeys(s)) if (k.includes(needle)) s.removeItem(k)
    } catch {
        // ignore
    }
}

export function cacheClearAll(): void {
    mem.clear()
    try {
        const s = ls()
        if (!s) return
        for (const k of ourKeys(s)) s.removeItem(k)
    } catch {
        // ignore
    }
}

/** Drop the in-memory layer only (tests simulate a reload). */
export const resetMemory = (): void => mem.clear()
