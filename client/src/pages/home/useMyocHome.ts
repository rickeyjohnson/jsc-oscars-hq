import { useEffect, useState } from "react"
import { fetchIdeas, fetchMyocWindows } from "../../api/myoc"
import { cacheGet, cacheSet } from "../../lib/cache/store"
import { userScope } from "../../lib/cache/keys"
import { pickWindow, windowPhase } from "../../lib/myoc"
import type { MyocHome } from "./useHomeData"

type Cached = { value: MyocHome | null }
const MAX_AGE_MS = 24 * 3600_000
const keyFor = (seasonId: string) => `myoc-home:${seasonId}`

// Last answer for this member and season (own idea count, so it is per user). Shown at once while a fresh read runs.
const readCached = (userId: string, seasonId: string | null | undefined): MyocHome | null | undefined => {
    if (!userId || !seasonId) return undefined
    const hit = cacheGet<Cached>(userScope(userId), keyFor(seasonId))
    return hit && Date.now() - hit.at < MAX_AGE_MS ? hit.data.value : undefined
}

/**
 * MYOC for the Home card.
 *   undefined = still loading (the card shows a skeleton), null = nothing to show (card hidden), value = the window.
 * Silent on failure (the tables may not exist yet): the card just stays hidden. `seasonId` null means the season is known to be missing.
 * Idea count is the member's own, withdrawn ones excluded (the committee's RLS view returns everyone's, so filter by author).
 * Stale-while-revalidate: the cached answer for this member renders first, then the live one replaces it.
 */
export function useMyocHome(seasonId: string | null | undefined, userId: string): MyocHome | null | undefined {
    const [myoc, setMyoc] = useState<MyocHome | null | undefined>(() => readCached(userId, seasonId))
    useEffect(() => {
        if (!seasonId) return
        let live = true
        const cached = readCached(userId, seasonId)
        if (cached !== undefined) setMyoc(cached)
        void (async () => {
            const store = (value: MyocHome | null) => {
                if (userId) cacheSet<Cached>(userScope(userId), keyFor(seasonId), { value })
            }
            try {
                const now = new Date()
                const w = pickWindow(await fetchMyocWindows(seasonId), now)
                const phase = windowPhase(w, now)
                if (!w || (phase !== "open" && phase !== "upcoming")) {
                    store(null)
                    if (live) setMyoc(null)
                    return
                }
                const sent = phase === "open" ? (await fetchIdeas(w.id)).filter((i) => i.author_id === userId && i.status !== "withdrawn").length : 0
                const value = { window: w, sent }
                store(value)
                if (live) setMyoc(value)
            } catch {
                if (live) setMyoc(null)
            }
        })()
        return () => {
            live = false
        }
    }, [seasonId, userId])
    return seasonId === null ? null : myoc
}
