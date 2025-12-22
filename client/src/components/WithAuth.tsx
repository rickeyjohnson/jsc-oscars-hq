import { type ComponentType } from "react"
import { useAuth } from "../context/AuthContext"
import { Navigate } from "react-router-dom"
import FullScreenLoader from "./FullScreenLoader"

const WithAuth = (WrappedComponent: ComponentType<object>) => {
    return function ProtectedComponent(props: object) {
        const { user, loading } = useAuth()

        if (loading) {
            return (
                <div className="bg-zinc-900 text-amber-100">
                    <FullScreenLoader />
                </div>
            )
        }

        if (!user) {
            return <Navigate to="/" replace />
        }

        return <WrappedComponent {...props} />
    }
}

export default WithAuth
