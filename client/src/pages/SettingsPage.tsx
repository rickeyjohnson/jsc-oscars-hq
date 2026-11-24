import { useState } from "react"
import { CalendarPlus, CircleHelp, MessageSquare, RotateCcw, ScrollText, Lightbulb, Mail, Smartphone, SlidersHorizontal, User, Waves } from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { useUserData } from "../context/UserContenxt"
import EditProfileModal from "../components/EditProfileModal"
import { fetchCurrentSeason } from "../api/ballots"
import { authRedirectUrl } from "../lib/siteUrl"
import type { Season } from "../types"
import { GroupedSection } from "../ui/GroupedSection"
import { APP_VERSION } from "../lib/patchNotes"
import { ListRow } from "../ui/ListRow"
import { Screen } from "../ui/Screen"
import { Switch } from "../ui/Switch"
import { useToast } from "../ui/Toast"
import { useReduceMotionSetting } from "../ui/ReduceMotion"
import { FirstRunGuide } from "./FirstRunGuide"
import { FeatureIntro } from "../ui/FeatureIntro"
import { INTROS_RESET_EVENT, introsFor, resetIntros } from "../ui/logic/featureIntros"
import { resetGuide } from "../ui/logic/firstRun"
import { CustomizeHomeSheet } from "./home/CustomizeHomeSheet"
import { DEFAULT_CEREMONY_MINUTES, buildIcs, downloadIcs, icsFileName } from "../ui/logic/ics"
import { loadHomePrefs, saveHomePrefs, type HomePrefs } from "../ui/logic/homePrefs"

const storage = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}
const icon = (I: typeof User) => <I aria-hidden className="size-5 text-label-2" />

const SettingsPage = () => {
    const { profile } = useUserData()
    const { session } = useAuth()
    const toast = useToast()
    const isCommittee = Boolean(profile?.is_committee)
    const userId = profile?.user_id ?? session?.user.id ?? ""
    const [prefs, setPrefs] = useState<HomePrefs>(() => loadHomePrefs(storage(), userId, isCommittee))
    const [customizing, setCustomizing] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [guideOpen, setGuideOpen] = useState(false)
    const [guideSeason, setGuideSeason] = useState<Season | null>(null)
    const [reduce, setReduce] = useReduceMotionSetting()

    const sendReset = async () => {
        const email = profile?.email
        if (!email) return
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl("/login/reset") })
        if (error) console.error("error reseting password:", error.message)
        toast.show("Check your email")
    }
    const [intro, setIntro] = useState<{ id: string; on: boolean } | null>(null)
    const visibleIntros = introsFor(isCommittee)
    const shownIntro = intro ? visibleIntros.find((i) => i.id === intro.id) : undefined
    const showAgain = () => {
        resetIntros(storage(), userId)
        resetGuide(storage(), userId)
        window.dispatchEvent(new Event(INTROS_RESET_EVENT))
        toast.show("Tips will show again")
    }
    const openGuide = () => {
        setGuideOpen(true)
        fetchCurrentSeason().then(setGuideSeason, () => {})
    }
    const addToCalendar = async () => {
        let season: Season | null = null
        try {
            season = await fetchCurrentSeason()
        } catch {
            /* handled below */
        }
        if (!season?.ceremony_at) {
            toast.show("The ceremony date isn't set yet")
            return
        }
        const title = season.name || "JSC Oscars"
        downloadIcs(icsFileName(title), buildIcs({ uid: `${season.id}@jsc-oscars`, title, start: new Date(season.ceremony_at), durationMinutes: DEFAULT_CEREMONY_MINUTES, location: season.location, now: new Date() }))
    }

    return (
        <Screen title="Settings" back={{ to: "/app/profile", label: "You" }}>
            <div className="space-y-6">
                <GroupedSection header="Account">
                    <ListRow title="Edit profile" leading={icon(User)} chevron onClick={() => setEditOpen(true)} />
                    <ListRow title="Send password reset email" leading={icon(Mail)} onClick={sendReset} />
                </GroupedSection>
                <GroupedSection header="App">
                    <ListRow title="Customize Home" leading={icon(SlidersHorizontal)} chevron onClick={() => setCustomizing(true)} />
                    <ListRow title="Add Oscar night to your calendar" leading={icon(CalendarPlus)} onClick={addToCalendar} />
                    <ListRow title="Make Your Own Categories" subtitle="Suggest a category for the next ballot" leading={icon(Lightbulb)} chevron to="/app/profile/settings/myoc" />
                    <ListRow title="Reduce motion" subtitle="Turns off animations and transitions" leading={icon(Waves)} trailing={<Switch label="Reduce motion" checked={reduce} onChange={setReduce} />} />
                    <ListRow title="Install on your phone" subtitle="In your browser's share menu, choose Add to Home Screen" leading={icon(Smartphone)} />
                </GroupedSection>
                <GroupedSection header="How it works">
                    <ListRow title="Welcome guide" subtitle="A quick tour of voting and results" leading={icon(CircleHelp)} chevron onClick={openGuide} />
                    {visibleIntros.map((i) => (
                        <ListRow key={i.id} title={i.title} chevron onClick={() => setIntro({ id: i.id, on: true })} />
                    ))}
                </GroupedSection>
                <GroupedSection header="Help">
                    <ListRow title="Show all tips again" subtitle="Replays each tip the next time you visit its screen" leading={icon(RotateCcw)} onClick={showAgain} />
                    <ListRow title="Feedback" subtitle="Report a bug or share an idea with the committee" leading={icon(MessageSquare)} chevron to="/app/profile/settings/feedback" />
                    <ListRow title="Patch notes" subtitle={`What changed. You have v${APP_VERSION}`} leading={icon(ScrollText)} chevron to="/app/profile/settings/patch-notes" />
                    <ListRow title="Not getting emails?" subtitle="Ask Rickey or Kadin" />
                </GroupedSection>
            </div>
            <CustomizeHomeSheet
                open={customizing}
                onClose={() => setCustomizing(false)}
                prefs={prefs}
                isCommittee={isCommittee}
                onChange={(p) => {
                    setPrefs(p)
                    saveHomePrefs(storage(), userId, p)
                    toast.show("Home updated")
                }}
            />
            {shownIntro && <FeatureIntro intro={shownIntro} open={Boolean(intro?.on)} onClose={() => setIntro((o) => (o ? { ...o, on: false } : o))} />}
            <FirstRunGuide open={guideOpen} onClose={() => setGuideOpen(false)} season={guideSeason} />
            <EditProfileModal isOpen={editOpen} onClose={() => setEditOpen(false)} />
        </Screen>
    )
}

export default SettingsPage
