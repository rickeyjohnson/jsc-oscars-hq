import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Countdown from "../components/Countdown"
import PendingBallots from "../components/PendingBallots"
import MusicPlaylistSection from "../components/MusicPlaylistSection"
import MakeYourOwnCategories from "../components/MakeYourOwnCategories"
import Locked from "../components/Locked"
import Announcements from "../components/Announcements"
import ProfileSetup from "../components/ProfileSetup"
import { useState } from "react"

const HomePage = () => {
    const [profileSetupComplete, setProfileSetupComplete] = useState(false)

    const handleProfileSetupComplete = () => {
        setProfileSetupComplete(false)
    }

    return (
        <div className="realtive bg-zinc-900 min-h-screen text-[#fffadd] pb-24 font-poppins overflow-hidden">
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
                <Announcements />
            </div>

            <NavigationTabs activeTab={"home"} />

            {!profileSetupComplete && (
                <ProfileSetup onComplete={handleProfileSetupComplete} />
            )}
        </div>
    )
}

export default HomePage
