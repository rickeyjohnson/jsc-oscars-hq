import { Lock } from "lucide-react"
import type { ReactNode } from "react"

type LockedProps = {
    children: ReactNode
    description?: string
}
const Locked = ({ children, description = "Coming Soon" }: LockedProps) => {
    return (
        <div className="relative">
            <div className="pointer-events-none select-none blur-sm">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50 backdrop-blur-md">
                <div className="flex flex-col items-center text-center text-white">
                    <Lock className="mb-3 h-10 w-10 opacity-90" />
                    <p className="text-sm opacity-80">{description}</p>
                </div>
            </div>
        </div>
    )
}

export default Locked
