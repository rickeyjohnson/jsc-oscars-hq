import type { BallotDetail } from "../../types"
import { cacheDel, cacheGet, cacheSet } from "./store"
import { userScope } from "./keys"

// Per-user copy of the last ballot detail the server returned. Draft ballots are never stored.
// Only a RELEASED detail may be served instead of a request (release is one-way). Anything else is
// a display-only first-paint seed: the screen must keep vote controls off until a fresh read lands.
export const RELEASED_MAX_MS = 7 * 24 * 3600_000
export const SEED_MAX_MS = 24 * 3600_000
/** Within this distance of opens_at/closes_at the clock decides who may vote: no seeding, always wait for the server. */
export const EDGE_MS = 10 * 60_000

export const detailKey = (ballotId: string): string => `ballotdetail:${ballotId}`

export function storeBallotDetail(uid: string, detail: BallotDetail): void {
    if (detail.status === "draft") cacheDel(userScope(uid), detailKey(detail.id))
    else cacheSet(userScope(uid), detailKey(detail.id), detail)
}

export function cachedReleasedDetail(uid: string, ballotId: string, now = Date.now()): BallotDetail | null {
    const hit = cacheGet<BallotDetail>(userScope(uid), detailKey(ballotId))
    if (!hit || hit.data.status !== "released") return null
    const age = now - hit.at
    return age >= 0 && age < RELEASED_MAX_MS ? hit.data : null
}

/** Last known detail for first paint only (sync). Null for drafts, old entries and the minutes around open/close. */
export function peekBallotDetail(uid: string | null | undefined, ballotId: string, now = Date.now()): BallotDetail | null {
    if (!uid) return null
    const hit = cacheGet<BallotDetail>(userScope(uid), detailKey(ballotId))
    if (!hit || hit.data.status === "draft") return null
    const age = now - hit.at
    if (age < 0 || age >= (hit.data.status === "released" ? RELEASED_MAX_MS : SEED_MAX_MS)) return null
    for (const edge of [hit.data.opens_at, hit.data.closes_at]) {
        const t = new Date(edge).getTime()
        if (!Number.isFinite(t) || Math.abs(now - t) <= EDGE_MS) return null
    }
    return hit.data
}
