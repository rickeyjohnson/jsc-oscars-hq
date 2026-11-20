import { CircleCheck } from "lucide-react"
import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"

const ComfirmedEmailPage = () => {
    return (
        <div className="bg-bg text-label relative min-h-dvh overflow-hidden">
            <FallingProfileBallsPhysics />
            <main className="px-gutter pt-safe pb-safe pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-4 text-center">
                <OscarLogo size="small" decorative />
                <CircleCheck aria-hidden className="text-success size-10" />
                <h1 className="text-title-1">Email confirmed.</h1>
                <p className="text-callout text-label-2">You can close this tab and log in.</p>
            </main>
        </div>
    )
}

export default ComfirmedEmailPage
