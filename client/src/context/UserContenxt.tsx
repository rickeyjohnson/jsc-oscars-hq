import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "../supabaseClient"
import type { Member } from "../types"

interface UserProfile {
    user_id: string
    username: string
    display_name: string
    email: string
    image_url: string
    created_at: string
    is_committee: boolean
}

interface UserDataContextType {
    profile: UserProfile | null
    member: Member | null
    loading: boolean
    /** True when the member lookup errored (so "no member" is not trustworthy). */
    memberFailed?: boolean
    /** True when the profile lookup errored (so "no profile" / "not committee" is not trustworthy). */
    profileFailed?: boolean
    /** Re-run the profile + member lookup (e.g. after claiming a name). */
    refetch: () => Promise<void>
    fetchOscars: () => Promise<OscarsEvent[]>
}

export interface OscarsEvent {
    id?: string
    starts_at?: string | null
    ends_at?: string | null
    semester?: string | null
    name?: string | null
}

const UserDataContext = createContext<UserDataContextType | null>(null)

export const UserDataProvider = ({
    children,
}: {
    children: React.ReactNode
}) => {
    const { user } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [member, setMember] = useState<Member | null>(null)
    const [loading, setLoading] = useState(true)
    const [memberFailed, setMemberFailed] = useState(false)
    const [profileFailed, setProfileFailed] = useState(false)
    const retried = useRef(false)
    const [tick, setTick] = useState(0)
    const pending = useRef<(() => void)[]>([])

    // TODO: add other supabase fetches (chatgpt helper functions)
    // fetchStats
    // fetchBallots
    // fetchLeaderboard

    const fetchOscars = async () => {
        const { data, error } = await supabase
            .from("oscarsEvents")
            .select("*")
            .order("starts_at", { ascending: false })

        if (error) {
            console.error("Error fetching oscars")
            return []
        }

        return data
    }

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false)
                return
            }

            const [profileRes, memberRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("user_id, username, display_name, email, image_url, created_at, is_committee")
                    .eq("user_id", user.id)
                    .single(),
                supabase
                    .from("members")
                    .select("id, name, user_id")
                    .eq("user_id", user.id)
                    .maybeSingle(),
            ])

            if (profileRes.error) {
                console.error("Error fetching profile:", profileRes.error)
                setProfileFailed(true)
                // a cold database often answers the second time: try once more on our own
                if (!retried.current) {
                    retried.current = true
                    setTimeout(() => setTick((t) => t + 1), 1500)
                }
            } else {
                retried.current = false
                setProfileFailed(false)
                setProfile(profileRes.data as UserProfile)
            }
            if (memberRes.error) {
                console.error("Error fetching member:", memberRes.error)
                setMemberFailed(true)
            } else {
                setMemberFailed(false)
                setMember(memberRes.data)
            }
            setLoading(false)
            pending.current.splice(0).forEach((resolve) => resolve())
        }

        fetchProfile()
    }, [user, tick])

    const refetch = useCallback(
        () =>
            new Promise<void>((resolve) => {
                pending.current.push(resolve)
                setTick((t) => t + 1)
            }),
        []
    )

    return (
        <UserDataContext.Provider value={{ profile, member, loading, memberFailed, profileFailed, refetch, fetchOscars }}>
            {children}
        </UserDataContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUserData = () => {
    const context = useContext(UserDataContext)
    if (!context)
        throw new Error("useUserData must be used within UserDataProvider")
    return context
}
