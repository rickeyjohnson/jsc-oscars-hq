import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useUserData } from "../context/UserContenxt"
import FullScreenLoader from "./FullScreenLoader"

export const committeeGate = (
    loading: boolean,
    profile: { is_committee: boolean } | null
): "loading" | "allow" | "deny" => {
    if (loading) return "loading"
    return profile?.is_committee ? "allow" : "deny"
}

// UX only: RLS is the real protection.
const RequireCommittee = ({ children }: { children: ReactNode }) => {
    const { profile, loading } = useUserData()
    const gate = committeeGate(loading, profile)

    if (gate === "loading") {
        return (
            <div className="bg-zinc-900 text-amber-100">
                <FullScreenLoader />
            </div>
        )
    }
    if (gate === "deny") return <Navigate to="/app" replace />
    return <>{children}</>
}

export default RequireCommittee
