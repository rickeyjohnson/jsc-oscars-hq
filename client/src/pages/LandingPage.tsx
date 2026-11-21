import FallingProfileBallsPhysics from "../components/FallingProfileBallPhysics"
import OscarLogo from "../components/OscarLogo"
import { useAuth } from "../context/AuthContext"
import { Button } from "../ui/Button"

const LandingPage = () => {
    const { user } = useAuth()
    return (
        <div className="bg-bg text-label relative min-h-dvh overflow-hidden">
            <FallingProfileBallsPhysics />
            <main className="px-gutter pt-safe pb-safe pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-10 py-10">
                <div className="flex flex-col items-center">
                    <OscarLogo size="medium" as="h1" />
                </div>
                <div className="pointer-events-auto flex flex-col gap-3">
                    {user ? (
                        <Button to="/app" variant="primary" size="lg" fullWidth>
                            Open app
                        </Button>
                    ) : (
                        <>
                            <Button to="/signup" variant="primary" size="lg" fullWidth>
                                Get started
                            </Button>
                            <Button to="/login" variant="secondary" size="lg" fullWidth>
                                Log in
                            </Button>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

export default LandingPage
