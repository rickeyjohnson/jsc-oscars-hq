import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Countdown from "../components/Countdown"
import PendingBallots from "../components/PendingBallots"
import MusicPlaylistSection from "../components/MusicPlaylistSection"
import MakeYourOwnCategories from "../components/MakeYourOwnCategories"
import Locked from "../components/Locked"
import Announcements from "../components/Announcements"
import ProfileSetup from "../components/ProfileSetup"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../supabaseClient"

const HomePage = () => {
    const { user } = useAuth()
    const [profileSetupComplete, setProfileSetupComplete] = useState<
        boolean | null
    >(true)

    const handleProfileSetupComplete = () => {
        setProfileSetupComplete(false)
    }

    useEffect(() => {
        const isProfileComplete = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("image_url")
                .eq("user_id", user?.id)
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
                <Countdown />
                <PendingBallots />
                <Locked>
                    <MakeYourOwnCategories />
                </Locked>
                <Locked>
                    <MusicPlaylistSection />
                </Locked>
                <Locked>
                    <Announcements />
                </Locked>
            </div>

            <NavigationTabs activeTab={"home"} />

            {!profileSetupComplete && (
                <ProfileSetup onComplete={handleProfileSetupComplete} />
            )}
        </div>
    )
}

export default HomePage
