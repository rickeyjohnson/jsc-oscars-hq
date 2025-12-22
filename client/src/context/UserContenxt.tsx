import { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import { supabase } from "../supabaseClient"

interface UserProfile {
    user_id: string
    username: string
    display_name: string
    email: string
    image_url: string
    created_at: string
    is_committee: string
}

interface UserDataContextType {
    profile: UserProfile | null
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
            if (!user) return

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single()

            if (error) {
                console.error("Error fetching profile:", error)
            } else {
                setProfile(data)
                console.log(data)
            }
            setLoading(false)
        }

        fetchProfile()
    }, [user])

    return (
        <UserDataContext.Provider value={{ profile, loading, fetchOscars }}>
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
