import { useCallback, useEffect, useRef, useState } from "react"
import { fetchBallotSummaries, fetchCurrentSeason } from "../api/ballots"
import { fetchMembers } from "../api/members"
import { fetchReleaseStatus, fetchSeasonResults } from "../api/results"
import { fetchAllVotes } from "../api/votes"
import { loadHomeData, type HomeData, type HomeIO } from "./logic/homeData"

const realIO: HomeIO = { fetchCurrentSeason, fetchBallotSummaries, fetchSeasonResults, fetchReleaseStatus, fetchAllVotes, fetchMembers }

export type HomeDataState = { data: HomeData | null; loading: boolean; error: Error | null; reload: () => void }

/** One load for the whole Home screen. Committee-only data is fetched only when isCommittee. */
export function useHomeData(isCommittee: boolean): HomeDataState {
    const [state, setState] = useState<{ data: HomeData | null; loading: boolean; error: Error | null }>({ data: null, loading: true, error: null })
    const seq = useRef(0)
    const reload = useCallback(() => {
        const mine = ++seq.current
        setState((s) => ({ ...s, loading: true, error: null }))
        loadHomeData(isCommittee, realIO, new Date()).then(
            (data) => mine === seq.current && setState({ data, loading: false, error: null }),
            (e) => mine === seq.current && setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e : new Error(String(e)) })),
        )
    }, [isCommittee])
    useEffect(() => {
        reload()
        return () => {
            seq.current++
        }
    }, [reload])
    return { ...state, reload }
}
