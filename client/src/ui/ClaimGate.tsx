import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useUserData } from "../context/UserContenxt"
import { shouldClaimName } from "../lib/claimName"

/** Inside UserDataProvider: a signed-in user with no linked member (e.g. after Google) is sent to /claim. */
export function ClaimGate({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const { member, loading, profile, memberFailed } = useUserData()
    const { pathname } = useLocation()
    if (shouldClaimName({ user, member, loading, path: pathname, isCommittee: !!profile?.is_committee, memberFailed })) return <Navigate to="/claim" replace />
    return <>{children}</>
}
