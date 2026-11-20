import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"
import { Button } from "../ui/Button"

const LandingPage = () => {
    return (
        <div className="bg-bg text-label relative min-h-dvh overflow-hidden">
            <FallingProfileBallsPhysics />
            <main className="px-gutter pt-safe pb-safe pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-between py-10">
                <div className="mt-[12dvh] flex flex-col items-center">
                    <OscarLogo size="medium" as="h1" />
                    <p className="text-title-3 mt-4 text-center font-bold text-pebble-lemon">Be there or be ...</p>
                </div>
                <div className="pointer-events-auto flex flex-col gap-3">
                    <Button to="/signup" variant="primary" size="lg" fullWidth>
                        Get started
                    </Button>
                    <Button to="/login" variant="secondary" size="lg" fullWidth>
                        Log in
                    </Button>
                </div>
            </main>
        </div>
    )
}

export default LandingPage
