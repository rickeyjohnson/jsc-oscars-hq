import type { Session, User } from "@supabase/supabase-js"
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react"
import { supabase } from "../supabaseClient"

type AuthContexType = {
    session: Session | null
    user: User | null
    loading: boolean
    pendingProfile: PendingProfile | null
    setPendingProfile: Dispatch<SetStateAction<PendingProfile | null>>
}

type PendingProfile = {
    username: string
    display_name: string
    is_committee: boolean
    image: File
}

const AuthContext = createContext<AuthContexType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(
        null
    )

    const fetchSession = async () => {
        const currentSession = await supabase.auth.getSession()
        setSession(currentSession.data.session)
        setUser(currentSession.data.session?.user ?? null)
        setLoading(false)
    }

    useEffect(() => {
        const init = async () => {
            await fetchSession()
        }

        init()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
            }
        )

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    return (
        <AuthContext.Provider
            value={{
                session,
                user,
                loading,
                pendingProfile,
                setPendingProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider")
    }
    return context
}
