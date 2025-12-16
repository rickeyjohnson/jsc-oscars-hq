import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"

const HomePage = () => {
    return (
        <div className="bg-zinc-900 min-h-screen text-amber-100 pb-24">
            <NavigationBar />
            <NavigationTabs activeTab={"home"} />
        </div>
    )
}

export default HomePage
