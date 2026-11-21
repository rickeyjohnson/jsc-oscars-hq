import type { Session, User } from "@supabase/supabase-js"
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react"
import { supabase } from "../supabaseClient"
import { clearAll, clearUserCache } from "../lib/cache/clear"

type AuthContexType = {
    session: Session | null
    user: User | null
    loading: boolean
}

const AuthContext = createContext<AuthContexType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const prevUid = useRef<string | null>(null)

    const fetchSession = async () => {
        const currentSession = await supabase.auth.getSession()
        setSession(currentSession.data.session)
        setUser(currentSession.data.session?.user ?? null)
        prevUid.current = currentSession.data.session?.user?.id ?? null
        setLoading(false)
    }

    useEffect(() => {
        const init = async () => {
            await fetchSession()
        }

        init()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                // Only an explicit SIGNED_OUT clears caches (a network error during token refresh keeps the session and the cache).
                if (event === "SIGNED_OUT") clearAll()
                else if (event === "SIGNED_IN") {
                    const prev = prevUid.current
                    if (prev && prev !== session?.user?.id) clearUserCache(prev)
                }
                prevUid.current = session?.user?.id ?? null
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
