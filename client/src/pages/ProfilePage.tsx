import {
    Award,
    ChevronRight,
    FlaskConical,
    Laugh,
    Plus,
    Settings,
    Shield,
    SquareCheckBig,
    Target,
    TrendingUp,
    User,
    Users,
} from "lucide-react"
import NavigationBar from "../components/NavigationBar"
import NavigationTabs from "../components/NavigationTabs"
import { supabase } from "../supabaseClient"
import { useUserData } from "../context/UserContenxt"

const ProfilePage = () => {
    const { profile } = useUserData()
    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div>
            <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
                <NavigationBar />

                <main className="px-6 py-6 space-y-6">
                    <div className="text-center">
                        <img
                            className="w-24 h-24 rounded-full mx-auto mb-4"
                            src={profile?.image_url || "/blank-pfp.png"}
                        />
                        <h2 className="text-2xl font-black text-amber-100">
                            {profile?.username || "username"}
                        </h2>
                        <p className="text-amber-100/60">
                            {profile?.email || "username@example.com"}
                        </p>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-center">
                            <Award className="w-6 h-6 text-amber-100 mx-auto mb-2" />
                            <div className="text-2xl font-black text-amber-100">
                                18
                            </div>
                            <div className="text-xs text-amber-100/60">
                                Wins
                            </div>
                        </div>
                        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-center">
                            <Target className="w-6 h-6 text-amber-100 mx-auto mb-2" />
                            <div className="text-2xl font-black text-amber-100">
                                24
                            </div>
                            <div className="text-xs text-amber-100/60">
                                Votes
                            </div>
                        </div>
                        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-center">
                            <TrendingUp className="w-6 h-6 text-amber-100 mx-auto mb-2" />
                            <div className="text-2xl font-black text-amber-100">
                                75%
                            </div>
                            <div className="text-xs text-amber-100/60">
                                Rate
                            </div>
                        </div>
                    </div>

                    {/* Account Settings */}
                    <div className="space-y-3">
                        <button className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-left hover:bg-amber-100/10 transition">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-amber-100" />
                                    <span className="font-medium text-amber-100">
                                        Edit Profile
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-amber-100/40" />
                            </div>
                        </button>
                        <button className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-left hover:bg-amber-100/10 transition mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5 text-amber-100" />
                                    <span className="font-medium text-amber-100">
                                        Settings
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-amber-100/40" />
                            </div>
                        </button>

                        <div className="pt-4 border-t border-amber-100/10 space-y-3 mb-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FlaskConical className="w-5 h-5 text-amber-100" />
                                <span className="text-sm font-bold text-amber-100">
                                    Experimental
                                </span>
                            </div>
                            <button className="w-full bg-gradient-to-r from-green-500 to-cyan-600 rounded-2xl p-4 text-left hover:from-amber-600 hover:to-amber-700 transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Laugh className="w-5 h-5 text-zinc-900" />
                                        <span className="font-bold text-zinc-900">
                                            Joke Generator
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-zinc-900" />
                                </div>
                            </button>
                        </div>

                        {/* Committee Only */}
                        {profile?.is_committee && (
                            <div className="pt-4 border-t border-amber-100/10 space-y-3">
                                <div className="flex items-center gap-2 mb-6">
                                    <Shield className="w-5 h-5 text-amber-100" />
                                    <span className="text-sm font-bold text-amber-100">
                                        Admin Controls
                                    </span>
                                </div>
                                <button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 text-left hover:from-amber-600 hover:to-amber-700 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Plus className="w-5 h-5 text-zinc-900" />
                                            <span className="font-bold text-zinc-900">
                                                Create New Ballot
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-900" />
                                    </div>
                                </button>
                                <button className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-left hover:bg-amber-100/10 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Settings className="w-5 h-5 text-amber-100" />
                                            <span className="font-medium text-amber-100">
                                                Manage Ballots
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-amber-100/40" />
                                    </div>
                                </button>
                                <button className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-left hover:bg-amber-100/10 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <SquareCheckBig className="w-5 h-5 text-amber-100" />
                                            <span className="font-medium text-amber-100">
                                                View Results
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-amber-100/40" />
                                    </div>
                                </button>
                                <button className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 text-left hover:bg-amber-100/10 transition">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-amber-100" />
                                            <span className="font-medium text-amber-100">
                                                User Management
                                            </span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-amber-100/40" />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 font-bold hover:bg-red-500/20 transition mt-6"
                    >
                        Sign Out
                    </button>
                </main>

                <NavigationTabs activeTab={"profile"} />
            </div>
        </div>
    )
}

export default ProfilePage
