import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useUserData } from "../context/UserContenxt"
import FullScreenLoader from "./FullScreenLoader"
import { ErrorState } from "../ui/ErrorState"
import { COPY } from "../ui/copy"

export const committeeGate = (
    loading: boolean,
    profile: { is_committee: boolean } | null,
    profileFailed = false
): "loading" | "allow" | "deny" | "error" => {
    if (loading) return "loading"
    if (!profile && profileFailed) return "error"
    return profile?.is_committee ? "allow" : "deny"
}

// UX only: RLS is the real protection.
const RequireCommittee = ({ children }: { children: ReactNode }) => {
    const { profile, loading, profileFailed, refetch } = useUserData()
    const gate = committeeGate(loading, profile, profileFailed)

    if (gate === "loading") {
        return (
            <div className="bg-zinc-900 text-amber-100">
                <FullScreenLoader />
            </div>
        )
    }
    if (gate === "error")
        return (
            <div className="min-h-dvh bg-bg px-gutter pt-safe">
                <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("your profile")} onRetry={() => void refetch()} />
            </div>
        )
    if (gate === "deny") return <Navigate to="/app" replace />
    return <>{children}</>
}

export default RequireCommittee
