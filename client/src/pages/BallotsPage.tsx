import NavigationBar from '../components/NavigationBar'
import NavigationTabs from '../components/NavigationTabs'

const BallotsPage = () => {
  return (
    <div>
        <div className="bg-zinc-900 min-h-screen text-amber-100 pb-24">
            <NavigationBar />
            BALLOT PAGE
            <NavigationTabs activeTab={"ballots"} />
        </div>
    </div>
  )
}

export default BallotsPage