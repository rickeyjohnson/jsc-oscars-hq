import { cacheGet, cacheSet } from "./store"
import { dedupe } from "./dedup"

export type ReadOpts<T> = {
    /** Within this window the cached value is returned with no request. */
    fresh: number
    /** Between fresh and max: return the cached value and revalidate. Past max or no entry: wait for the network. */
    max: number
    now?: number
    /** Return false to keep a value OUT of the cache (e.g. results before the release gate was confirmed). */
    shouldStore?: (data: T) => boolean
    /** Called with the revalidated value; compare before setState to avoid flashes. */
    onRevalidate?: (data: T) => void
}
export type ReadResult<T> = { data: T; from: "fresh-cache" | "stale-cache" | "network" }

export async function readThrough<T>(scope: string, key: string, fetcher: () => Promise<T>, opts: ReadOpts<T>): Promise<ReadResult<T>> {
    const now = opts.now ?? Date.now()
    const fetchAndStore = () =>
        dedupe(`${scope}/${key}`, async () => {
            const data = await fetcher()
            if (!opts.shouldStore || opts.shouldStore(data)) cacheSet(scope, key, data)
            return data
        })
    const hit = cacheGet<T>(scope, key)
    if (hit) {
        const age = now - hit.at
        if (age >= 0 && age < opts.fresh) return { data: hit.data, from: "fresh-cache" }
        if (age >= 0 && age < opts.max) {
            fetchAndStore()
                .then((d) => opts.onRevalidate?.(d))
                .catch(() => undefined) // a failed background refresh keeps the cached value
            return { data: hit.data, from: "stale-cache" }
        }
    }
    return { data: await fetchAndStore(), from: "network" }
}

/** Compare before setState so an unchanged revalidation does not re-render. */
export const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
