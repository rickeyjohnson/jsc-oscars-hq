// Collapse identical concurrent calls into one request. No result is kept after it settles,
// so this can never serve stale data: a call made after settling always hits the network.
const inflight = new Map<string, Promise<unknown>>()

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
    const hit = inflight.get(key)
    if (hit) return hit as Promise<T>
    const p = run().finally(() => {
        if (inflight.get(key) === p) inflight.delete(key)
    })
    inflight.set(key, p)
    return p
}

/** Call right after a mutation so a later read never joins a request that started before it. */
export function forget(key: string): void {
    inflight.delete(key)
}

export function forgetPrefix(prefix: string): void {
    for (const k of [...inflight.keys()]) if (k.startsWith(prefix)) inflight.delete(k)
}

export const clearInflight = (): void => inflight.clear()
