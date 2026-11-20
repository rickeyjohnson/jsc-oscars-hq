import { createContext, useContext, useEffect, useState } from "react"
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
    fetchOscars: () => Promise<OscarsEvent[]>
}

export interface OscarsEvent {
    id?: string | null
    starts_at?: string
    ends_at?: string
    semester?: string
    name?: string
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
                    .select("*")
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
            } else {
                setProfile(profileRes.data as UserProfile)
            }
            if (memberRes.error) {
                console.error("Error fetching member:", memberRes.error)
            } else {
                setMember(memberRes.data)
            }
            setLoading(false)
        }

        fetchProfile()
    }, [user])

    return (
        <UserDataContext.Provider value={{ profile, member, loading, fetchOscars }}>
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
