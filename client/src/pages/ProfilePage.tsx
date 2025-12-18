import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { supabase } from "../supabaseClient"

const ProfilePage = () => {

    const handleLogout = async () =>{
        await supabase.auth.signOut()
    }

    return <div>
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
            <NavigationBar />
            <button onClick={handleLogout} className="bg-red-950 p-12">
                logout
            </button>
            <NavigationTabs activeTab={"profile"} />
        </div>
    </div>
}

export default ProfilePage
