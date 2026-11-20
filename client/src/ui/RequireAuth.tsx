import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Skeleton, SkeletonScreen } from "./Skeleton"
import { COPY } from "./copy"

export function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth()
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
    if (!user) return <Navigate to="/" replace />
    return <>{children}</>
}
