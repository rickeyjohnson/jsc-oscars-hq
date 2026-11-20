import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Countdown from "../components/Countdown"
import PendingBallots from "../components/PendingBallots"
import ProfileSetup from "../components/ProfileSetup"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../supabaseClient"
import { fetchBallotSummaries, fetchCurrentSeason } from "../api/ballots"
import type { BallotSummary } from "../lib/voting"
import type { Season } from "../types"

const HomePage = () => {
    const { user } = useAuth()
    const [profileSetupComplete, setProfileSetupComplete] = useState<
        boolean | null
    >(true)

    const [season, setSeason] = useState<Season | null>(null)
    const [ballots, setBallots] = useState<BallotSummary[]>([])

    const [seasonError, setSeasonError] = useState(false)
    const [ballotsError, setBallotsError] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        setSeasonError(false)
        setBallotsError(false)
        fetchCurrentSeason().then(setSeason).catch((e) => { console.error("Error loading season: ", e); setSeasonError(true) })
        fetchBallotSummaries().then(setBallots).catch((e) => { console.error("Error loading ballots: ", e); setBallotsError(true) })
    }, [reloadKey])

    const handleProfileSetupComplete = () => {
        setProfileSetupComplete(false)
    }

    useEffect(() => {
        const isProfileComplete = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("image_url")
                .eq("user_id", user?.id ?? "")
                .single()

            if (error) {
                console.error(
                    "Error fetching if profile is complete: ",
                    error.message
                )
                setProfileSetupComplete(true)
            }

            setProfileSetupComplete(data?.image_url !== null)
        }

        isProfileComplete()
    }, [user?.id])

    return (
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24 font-poppins">
            <NavigationBar />

            <div className="px-6 py-6 space-y-6">
                {seasonError ? <p className="text-sm text-red-400 text-center">Couldn't load the ceremony date</p> : <Countdown season={season} />}
                {ballotsError ? (
                    <p className="text-sm text-red-400 text-center">
                        Couldn't load ballots{" "}
                        <button className="underline" onClick={() => setReloadKey((k) => k + 1)}>
                            Retry
                        </button>
                    </p>
                ) : (
                    <PendingBallots ballots={ballots} />
                )}
            </div>

            <NavigationTabs activeTab={"home"} />

            {!profileSetupComplete && (
                <ProfileSetup onComplete={handleProfileSetupComplete} />
            )}
        </div>
    )
}

export default HomePage
