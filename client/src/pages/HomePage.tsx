import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Countdown from "../components/Countdown"
import PendingBallots from "../components/PendingBallots"
import MusicPlaylistSection from "../components/MusicPlaylistSection"
import MakeYourOwnCategories from "../components/MakeYourOwnCategories"
import Locked from "../components/Locked"

const HomePage = () => {
    return (
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24 font-poppins">
            <NavigationBar />

            <div className="px-6 py-6">
                <Countdown />
                <PendingBallots ballots={[1]}/>
                <MakeYourOwnCategories />
                <Locked>
                    <MusicPlaylistSection />
                </Locked>
            </div>

            <NavigationTabs activeTab={"home"} />
        </div>
    )
}

export default HomePage
