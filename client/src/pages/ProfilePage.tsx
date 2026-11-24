import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, CircleDot, KeyRound, Laugh, LogOut, Trophy, Dices, ArrowUpDown, Pencil, Plus, Settings, SquareCheckBig, Users } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useUserData } from "../context/UserContenxt"
import { displayName } from "../lib/displayName"
import { SeasonSheet } from "../components/committee/SeasonSheet"
import JokeGeneratorModal from "../components/JokeGeneratorModal"
import EditProfileModal from "../components/EditProfileModal"
import { Avatar } from "../ui/Avatar"
import { GroupedSection } from "../ui/GroupedSection"
import { ListRow } from "../ui/ListRow"
import { Screen } from "../ui/Screen"
import { Button } from "../ui/Button"
import { MyStats } from "./stats/MyStats"
import { clearAll } from "../lib/cache/clear"

const icon = (I: typeof Settings) => <I aria-hidden className="size-5 text-label-2" />

const ProfilePage = () => {
    const { profile, member } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const navigate = useNavigate()
    const [manageOpen, setManageOpen] = useState(false)
    const [jokeOpen, setJokeOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const name = displayName(member, profile)
    return (
        <Screen title="You" width="wide">
            <div className="flex items-center gap-4 pb-6">
                <Avatar id={member?.id ?? profile?.user_id ?? name} name={name || "You"} src={profile?.image_url} size={96} ring="pebble" />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-title-1">{name}</h2>
                    {profile?.email && <p className="truncate text-subhead text-label-2">{profile.email}</p>}
                    <div className="mt-2">
                        <Button variant="secondary" size="sm" icon={<Pencil aria-hidden className="size-4" />} onClick={() => setEditOpen(true)}>Edit profile</Button>
                    </div>
                </div>
            </div>
            <MyStats />
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                <div className="space-y-6">
                    <GroupedSection header="Account">
                        <ListRow title="Settings" leading={icon(Settings)} chevron to="/app/profile/settings" />
                    </GroupedSection>
                    {isCommittee && (
                        <GroupedSection header="Committee">
                            <ListRow title="New ballot" leading={icon(Plus)} chevron to="/app/profile/ballots/create" />
                            <ListRow title="Manage ballots" leading={icon(SquareCheckBig)} chevron to="/app/profile/ballots" />
                            <ListRow title="Members" leading={icon(Users)} chevron to="/app/profile/members" />
                            <ListRow title="The envelope" leading={icon(KeyRound)} chevron to="/app/profile/release" />
                            <ListRow title="Season and ceremony date" leading={icon(Calendar)} chevron onClick={() => setManageOpen(true)} />
                        </GroupedSection>
                    )}
                </div>
                <div className="space-y-6">
                    <GroupedSection header="Labs">
                        <ListRow title="Joke generator" leading={icon(Laugh)} chevron onClick={() => setJokeOpen(true)} />
                        <ListRow title="Balls" subtitle="Toss everyone around" leading={icon(CircleDot)} chevron to="/app/profile/labs/balls" />
                        <ListRow title="Higher or lower" subtitle="Who has more? Keep your streak" leading={icon(ArrowUpDown)} chevron to="/app/profile/labs/higher-lower" />
                        <ListRow title="Slot machine" subtitle="Match three faces" leading={icon(Dices)} chevron to="/app/profile/labs/slots" />
                        <ListRow title="Trophy shelf" subtitle="Your wins on display. Only you see it." leading={icon(Trophy)} chevron to="/app/profile/labs/trophies" />
                    </GroupedSection>
                    <GroupedSection>
                        <ListRow
                            title="Log out"
                            destructive
                            leading={<LogOut aria-hidden className="size-5 text-danger" />}
                            onClick={async () => {
                                clearAll()
                                await supabase.auth.signOut()
                                navigate("/", { replace: true })
                            }}
                        />
                    </GroupedSection>
                </div>
            </div>
            <SeasonSheet open={manageOpen} onClose={() => setManageOpen(false)} />
            <JokeGeneratorModal isOpen={jokeOpen} onClose={() => setJokeOpen(false)} />
            <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
        </Screen>
    )
}

export default ProfilePage
