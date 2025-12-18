/* eslint-disable react-refresh/only-export-components */
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import Countdown from "../components/Countdown"

const HomePage = () => {
    return (
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
            <NavigationBar />

            <div className="px-6 py-6">
                <Countdown />
            </div>

            <NavigationTabs activeTab={"home"} />
        </div>
    )
}

export default HomePage
