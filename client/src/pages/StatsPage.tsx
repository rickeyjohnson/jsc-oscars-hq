import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"

const StatsPage = () => {
  return (
    <div>
        <div className="bg-zinc-900 min-h-screen text-amber-100 pb-24">
            <NavigationBar />
            STATS PAGE
            <NavigationTabs activeTab={"stats"} />
        </div>
    </div>
  )
}

export default StatsPage