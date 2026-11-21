import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, KeyRound, Laugh, LogOut, Plus, Settings, SquareCheckBig, User, Users } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useUserData } from "../context/UserContenxt"
import ManageOscarsModal from "../components/ManageOscarsModal"
import JokeGeneratorModal from "../components/JokeGeneratorModal"
import EditProfileModal from "../components/EditProfileModal"
import { nomineeStats } from "../lib/stats"
import type { Nominee } from "../types"
import { Avatar } from "../ui/Avatar"
import { ColorBlock } from "../ui/ColorBlock"
import { GroupedSection } from "../ui/GroupedSection"
import { ListRow } from "../ui/ListRow"
import { Screen } from "../ui/Screen"
import { Skeleton } from "../ui/Skeleton"
import { useHomeData } from "../ui/useHomeData"
import { youStats } from "../ui/logic/youStats"

const icon = (I: typeof User) => <I aria-hidden className="size-5 text-label-2" />

const ProfilePage = () => {
    const { profile, member } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const navigate = useNavigate()
    const state = useHomeData(isCommittee)
    const [manageOpen, setManageOpen] = useState(false)
    const [jokeOpen, setJokeOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const d = state.data
    const stats = useMemo(() => {
        if (!d) return null
        let tally: { wins: number; noms: number } | null = null
        if (d.released && d.results && member) {
            const nominees: Record<string, Nominee> = {}
            for (const c of d.results.categories) for (const n of c.nominees) nominees[n.id] = n
            tally = nomineeStats(Object.values(d.results.results), nominees).members[member.id] ?? { wins: 0, noms: 0 }
        }
        return youStats({ released: d.released, summaries: d.summaries, tally, ceremonyAt: d.season?.ceremony_at ? new Date(d.season.ceremony_at) : null, now: new Date() })
    }, [d, member])

    const name = profile?.username ?? ""
    return (
        <Screen title="You" width="wide">
            <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-8">
                <div>
                    <div className="flex items-center gap-4 pb-5">
                        <Avatar id={profile?.user_id ?? name} name={name || "You"} src={profile?.image_url} size={96} ring="pebble" />
                        <div className="min-w-0">
                            <h2 className="truncate text-title-1">{name}</h2>
                            {profile?.email && <p className="truncate text-subhead text-label-2">{profile.email}</p>}
                        </div>
                    </div>
                    {stats ? (
                        <div className="mb-6 grid grid-cols-3 gap-2 lg:grid-cols-1">
                            {stats.map((s) => (
                                s.pebble ? (
                                    <ColorBlock key={s.label} pebble={s.pebble} className="!p-3 lg:!p-4">
                                        <p className="font-display text-title-1 tabular-nums">{s.value}</p>
                                        <p className="text-caption-1">{s.label}</p>
                                    </ColorBlock>
                                ) : (
                                    <div key={s.label} className="rounded-card bg-surface p-3 text-label lg:p-4">
                                        <p className="font-display text-title-1 tabular-nums">{s.value}</p>
                                        <p className="text-caption-1 text-label-2">{s.label}</p>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <div className="mb-6 grid grid-cols-3 gap-2 lg:grid-cols-1">
                            <Skeleton shape="block" />
                            <Skeleton shape="block" />
                            <Skeleton shape="block" />
                        </div>
                    )}
                </div>
                <div className="space-y-6">
                    <GroupedSection header="Account">
                        <ListRow title="Edit profile" leading={icon(User)} chevron onClick={() => setEditOpen(true)} />
                        <ListRow title="Settings" leading={icon(Settings)} chevron to="/app/profile/settings" />
                    </GroupedSection>
                    {isCommittee && (
                        <GroupedSection header="Committee">
                            <ListRow title="New ballot" leading={icon(Plus)} chevron to="/app/profile/ballots/create" />
                            <ListRow title="Manage ballots" leading={icon(SquareCheckBig)} chevron to="/app/profile/ballots" />
                            <ListRow title="Members" leading={icon(Users)} chevron to="/app/profile/members" />
                            <ListRow title="The envelope" leading={icon(KeyRound)} chevron to="/app/profile/release" />
                            <ListRow title="Event dates" leading={icon(Calendar)} chevron onClick={() => setManageOpen(true)} />
                        </GroupedSection>
                    )}
                    <GroupedSection header="Labs">
                        <ListRow title="Joke generator" leading={icon(Laugh)} chevron onClick={() => setJokeOpen(true)} />
                    </GroupedSection>
                    <GroupedSection>
                        <ListRow
                            title="Log out"
                            destructive
                            leading={<LogOut aria-hidden className="size-5 text-danger" />}
                            onClick={async () => {
                                await supabase.auth.signOut()
                                navigate("/", { replace: true })
                            }}
                        />
                    </GroupedSection>
                </div>
            </div>
            <ManageOscarsModal isOpen={manageOpen} onClose={() => setManageOpen(false)} />
            <JokeGeneratorModal isOpen={jokeOpen} onClose={() => setJokeOpen(false)} />
            <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
        </Screen>
    )
}

export default ProfilePage
