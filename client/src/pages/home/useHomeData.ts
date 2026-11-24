import { useEffect, useMemo, useState } from "react"
import { useAvatarOverrides } from "../../lib/photoOverrides"
import { fetchMemberAvatars, fetchMembers } from "../../api/members"
import { useHomeData as useBaseHomeData, type HomeDataState } from "../../ui/useHomeData"
import type { MyocWindow } from "../../lib/myoc"
import type { StatsLoad } from "../stats/useStatsData"
import type { Member } from "../../types"

export type Directory = { members: Member[]; avatars: Record<string, string | null> }
/** The member's MYOC picture for Home; absent until it has loaded (and for good if MYOC fails or is not set up). */
export type MyocHome = { window: MyocWindow; sent: number }
export type HomeState = HomeDataState & { directory: Directory | null; /** undefined = loading (skeleton), null = nothing to show */ myoc?: MyocHome | null; /** Past seasons for the career line and trophy case; absent when neither widget is shown. */ stats?: StatsLoad }

/**
 * The Home screen's loader: the shared season/ballots/committee load plus the member directory
 * (names + photos), fetched only once results are released (leaderboard, winners avatars).
 * Directory failures are silent: avatars fall back to initials and the leaderboard hides.
 */
export function useHomeData(isCommittee: boolean, uid?: string | null): HomeState {
    const base = useBaseHomeData(isCommittee, uid)
    const released = Boolean(base.data?.released)
    const [directory, setDirectory] = useState<Directory | null>(null)
    useEffect(() => {
        if (!released) return
        let live = true
        Promise.all([fetchMembers(), fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>)]).then(
            ([members, avatars]) => live && setDirectory({ members, avatars }),
            (e) => {
                console.error("Error loading members: ", e)
                if (live) setDirectory({ members: [], avatars: {} })
            },
        )
        return () => {
            live = false
        }
    }, [released])
    const avatars = useAvatarOverrides(directory?.avatars ?? EMPTY)
    const merged = useMemo(() => (directory ? { ...directory, avatars } : directory), [directory, avatars])
    return { ...base, directory: merged }
}

const EMPTY: Record<string, string | null> = {}
