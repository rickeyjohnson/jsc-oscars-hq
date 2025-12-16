import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"

const ProfilePage = () => {
    return <div>
        <div className="bg-zinc-900 min-h-screen text-amber-100 pb-24">
            <NavigationBar />
            PROFILE PAGE
            <NavigationTabs activeTab={"profile"} />
        </div>
    </div>
}

export default ProfilePage
