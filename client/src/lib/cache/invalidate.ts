import { cacheDel, cacheDelKeyPrefix } from "./store"
import { forget, forgetPrefix } from "./dedup"
import { GLOBAL } from "./keys"

// Call these right AFTER a mutation succeeds. The epoch lets a read that started before the
// mutation notice it must not write its (now stale) result into the cache.
let epoch = 0
export const cacheEpoch = (): number => epoch

export function invalidateMembers(): void {
    epoch++
    cacheDel(GLOBAL, "members")
    cacheDel(GLOBAL, "directory")
    forget(`${GLOBAL}/members`)
    forget(`${GLOBAL}/directory`)
}

/** Ballot details and the Home first-paint snapshot (draft edits, nominee adds, status changes, release). */
export function invalidateBallots(): void {
    epoch++
    cacheDelKeyPrefix("ballotdetail:")
    cacheDelKeyPrefix("home:")
    forgetPrefix("bd:")
}

/** Results rows and the "season is released" markers (committee corrections, release). */
export function invalidateResults(): void {
    epoch++
    cacheDelKeyPrefix("results:")
    cacheDelKeyPrefix("released:")
    cacheDelKeyPrefix("home:")
    forgetPrefix("results:")
}
