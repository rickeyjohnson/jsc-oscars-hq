import { useEffect, useState } from "react"
import { fetchMemberAvatars, fetchMembers } from "../../api/members"
import { useHomeData as useBaseHomeData, type HomeDataState } from "../../ui/useHomeData"
import type { Member } from "../../types"

export type Directory = { members: Member[]; avatars: Record<string, string | null> }
export type HomeState = HomeDataState & { directory: Directory | null }

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
    return { ...base, directory }
}
