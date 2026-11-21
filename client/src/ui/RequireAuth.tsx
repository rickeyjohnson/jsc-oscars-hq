import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Skeleton, SkeletonScreen } from "./Skeleton"
import { COPY } from "./copy"

export function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
    const loc = useLocation()
    if (loading) {
        return (
            <div className="min-h-dvh bg-bg px-gutter pt-safe py-8">
                <SkeletonScreen label={COPY.loading}>
                    <div className="mx-auto max-w-[720px] space-y-4">
                        <Skeleton shape="line" width="40%" height="2rem" />
                        <Skeleton shape="card" />
                        <Skeleton shape="row" />
                        <Skeleton shape="row" />
                    </div>
                </SkeletonScreen>
            </div>
        )
    }
    if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search, notice: "Log in to continue. Your votes are saved." }} />
    return <>{children}</>
}
