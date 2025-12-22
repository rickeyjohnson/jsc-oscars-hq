import {
    Award,
    Calendar,
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
import ProfilePageButton from "../components/ProfilePageButton"
import ManageOscarsModal from "../components/ManageOscarsModal"
import { useState } from "react"
import UserManagementModal from "../components/UserManagementModal"
import JokeGeneratorModal from "../components/JokeGeneratorModal"
import EditProfileModal from "../components/EditProfileModal"

const ProfilePage = () => {
    const { profile } = useUserData()
    const [openManageOscarModal, setOpenManageOscarModal] = useState(false)
    const [openUserManagement, setOpenUserManagement] = useState(false)
    const [openJokeGenerator, setOpenJokeGenerator] = useState(false)
    const [openEditProfile, setOpenEditProfile] = useState(false)

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
                    <div>
                        <div className="space-y-3 mb-6">
                            <ProfilePageButton
                                label="Edit Profile"
                                icon={<User className="w-5 h-5" />}
                                onClick={() => setOpenEditProfile(true)}
                            />
                            <ProfilePageButton
                                label="Settings"
                                icon={<Settings className="w-5 h-5" />}
                            />
                        </div>

                        <div className="pt-4 border-t border-amber-100/10 space-y-3 mb-6">
                            <div className="flex items-center gap-2 mb-6">
                                <FlaskConical className="w-5 h-5 text-amber-100" />
                                <span className="text-sm font-bold text-amber-100">
                                    Experimental
                                </span>
                            </div>
                            <ProfilePageButton
                                label="Joke Generator"
                                icon={<Laugh className="w-5 h-5" />}
                                variant="gradient"
                                textColor="text-zinc-900"
                                iconColor="text-zinc-900"
                                rightIconColor="text-zinc-900"
                                className="from-green-500 to-cyan-600 hover:from-green-600 hover:to-cyan-700"
                                onClick={() => setOpenJokeGenerator(true)}
                            />
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
                                <ProfilePageButton
                                    label="Create New Ballot"
                                    icon={<Plus className="w-5 h-5" />}
                                    variant="gradient"
                                    textColor="text-zinc-900"
                                    iconColor="text-zinc-900"
                                />
                                <ProfilePageButton
                                    label="Manage Ballots"
                                    icon={<Settings className="w-5 h-5" />}
                                />
                                <ProfilePageButton
                                    label="View Results"
                                    icon={
                                        <SquareCheckBig className="w-5 h-5" />
                                    }
                                />
                                <ProfilePageButton
                                    label="User Management"
                                    icon={<Users className="w-5 h-5" />}
                                    onClick={() => setOpenUserManagement(true)}
                                />
                                <ProfilePageButton
                                    label="Manage Events"
                                    icon={<Calendar className="w-5 h-5" />}
                                    onClick={() =>
                                        setOpenManageOscarModal(true)
                                    }
                                />
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

                {/* Modals */}
                <ManageOscarsModal
                    isOpen={openManageOscarModal}
                    onClose={() => setOpenManageOscarModal(false)}
                />

                <UserManagementModal
                    isOpen={openUserManagement}
                    onClose={() => setOpenUserManagement(false)}
                />

                <JokeGeneratorModal
                    isOpen={openJokeGenerator}
                    onClose={() => setOpenJokeGenerator(false)}
                />

                <EditProfileModal
                    isOpen={openEditProfile}
                    onClose={() => setOpenEditProfile(false)}
                />
            </div>
        </div>
    )
}

export default ProfilePage
