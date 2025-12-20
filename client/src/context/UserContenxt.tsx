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
        <UserDataContext.Provider value={{ profile, loading }}>
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
