import { useCallback, useEffect, useRef, useState } from "react"
import { fetchBallotSummaries, fetchCurrentSeason } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { fetchReleaseStatus, fetchSeasonResults } from "../api/results"
import { fetchAllVotes } from "../api/votes"
import { useReleaseWatch } from "./useReleaseWatch"
import { fromHomeSnapshot, HOME_SNAPSHOT_KEY, HOME_SNAPSHOT_MAX_MS, loadHomeData, toHomeSnapshot, type HomeData, type HomeIO, type HomeSnapshot } from "./logic/homeData"
import { cacheGet, cacheSet } from "../lib/cache/store"
import { userScope } from "../lib/cache/keys"
import { sameJson } from "../lib/cache/swr"

const realIO: HomeIO = { fetchCurrentSeason, fetchBallotSummaries, fetchSeasonResults, fetchReleaseStatus, fetchAllVotes, fetchMembers }

const STALE_MS = 60_000

export type HomeDataState = {
    data: HomeData | null
    loading: boolean
    error: Error | null
    reload: () => void
    /** True while `data` is the last-known snapshot from this device and the server has not answered yet (or could not be reached). */
    fromCache?: boolean
}

const readSnapshot = (uid: string | null | undefined): HomeData | null => {
    if (!uid) return null
    const hit = cacheGet<HomeSnapshot>(userScope(uid), HOME_SNAPSHOT_KEY)
    if (!hit || Date.now() - hit.at >= HOME_SNAPSHOT_MAX_MS || Date.now() < hit.at) return null
    return fromHomeSnapshot(hit.data)
}

/**
 * One load for the whole Home screen. Committee-only data is fetched only when isCommittee.
 * With a uid, the last snapshot for that user paints first (stale-while-revalidate); every mount still reloads from the server.
 */
export function useHomeData(isCommittee: boolean, uid?: string | null): HomeDataState {
    const [state, setState] = useState<{ data: HomeData | null; loading: boolean; error: Error | null; fromCache: boolean }>(() => {
        const seed = readSnapshot(uid)
        return { data: seed, loading: true, error: null, fromCache: seed !== null }
    })
    const seq = useRef(0)
    const reload = useCallback(() => {
        const mine = ++seq.current
        setState((s) => ({ ...s, loading: true, error: null }))
        loadHomeData(isCommittee, realIO, new Date()).then(
            (data) => {
                if (mine !== seq.current) return
                const snap = toHomeSnapshot(data)
                if (uid && snap) cacheSet(userScope(uid), HOME_SNAPSHOT_KEY, snap)
                // Same content as what is on screen: keep the object so nothing re-renders or flashes.
                setState((s) => (s.data && !s.fromCache && sameJson(s.data, data) ? { ...s, loading: false, error: null } : { data, loading: false, error: null, fromCache: false }))
            },
            // A failed refresh keeps whatever is on screen (including the cached snapshot).
            (e) => mine === seq.current && setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e : new Error(String(e)) })),
        )
    }, [isCommittee, uid])
    // The user id can arrive after the first render: seed then, but never over data already shown.
    useEffect(() => {
        const seed = readSnapshot(uid)
        if (seed) setState((s) => (s.data ? s : { ...s, data: seed, fromCache: true }))
    }, [uid])
    useEffect(() => {
        reload()
        return () => {
            seq.current++
        }
    }, [reload])
    // Coming back to a tab that sat in the background for over a minute: refresh (the old data stays on screen meanwhile).
    useEffect(() => {
        let last = Date.now()
        const onVisible = () => {
            if (document.visibilityState !== "visible" || Date.now() - last < STALE_MS) return
            last = Date.now()
            reload()
        }
        document.addEventListener("visibilitychange", onVisible)
        return () => document.removeEventListener("visibilitychange", onVisible)
    }, [reload])
    // Sealed Home notices the reveal on its own (only the season row is polled).
    useReleaseWatch(Boolean(state.data && state.data.season && !state.data.released), reload)
    return { ...state, reload }
}
