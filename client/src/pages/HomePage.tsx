import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { SlidersHorizontal } from "lucide-react"
import { Avatar } from "../ui/Avatar"
import { ErrorState } from "../ui/ErrorState"
import { shouldAskForPhoto } from "../lib/photoPrompt"
import ProfileSetup from "../components/ProfileSetup"
import { useAuth } from "../context/AuthContext"
import { useUserData } from "../context/UserContenxt"
import { Screen } from "../ui/Screen"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { useToast } from "../ui/Toast"
import { loadHomePrefs, saveHomePrefs, type HomePrefs } from "../ui/logic/homePrefs"
import { resolveWidgets } from "../ui/logic/homeWidgets"
import { CustomizeHomeSheet } from "./home/CustomizeHomeSheet"
import { firstName } from "./home/format"
import { useHomeData } from "./home/useHomeData"
import { useMyocHome } from "./home/useMyocHome"
import { myocHomeView } from "../lib/myoc"
import { HomeWidget } from "./home/widgets"
import { FirstRunGuide } from "./FirstRunGuide"
import { hasSeenGuide, markGuideSeen } from "../ui/logic/firstRun"

const storage = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

const GRID = "grid grid-flow-dense grid-cols-2 items-stretch gap-3 lg:grid-cols-2 min-[1400px]:grid-cols-3"

const HomeBody = ({ userId, isCommittee, name, memberId, imageUrl, hold }: { userId: string; isCommittee: boolean; name: string; memberId?: string; imageUrl?: string | null; hold?: boolean }) => {
    const base = useHomeData(isCommittee, userId || null)
    const myoc = useMyocHome(base.data ? (base.data.season?.id ?? null) : undefined, userId)
    const state = useMemo(() => ({ ...base, myoc }), [base, myoc])
    const toast = useToast()
    const [prefs, setPrefs] = useState<HomePrefs>(() => loadHomePrefs(storage(), userId, isCommittee))
    const [customizing, setCustomizing] = useState(false)
    const [guideSeen, setGuideSeen] = useState(() => !userId || hasSeenGuide(storage(), userId))
    const closeGuide = () => {
        markGuideSeen(storage(), userId)
        setGuideSeen(true)
    }
    const released = Boolean(state.data?.released)
    // Until the first load answers, lay out release-gated widgets as skeletons so nothing pops in (or shifts) afterwards.
    const layoutReleased = state.data ? released : true
    const widgets = useMemo(() => resolveWidgets(prefs, { isCommittee, released: layoutReleased }), [prefs, isCommittee, layoutReleased])
    const totalFailure = !state.data && Boolean(state.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const now = useMemo(() => new Date(), [state.data])

    // The MYOC card only exists while there is a window to show: no placeholder cell otherwise.
    // undefined = still loading: hold the cell as a skeleton so the card does not pop in and shift the grid.
    const showMyoc = myoc === undefined || (myoc !== null && myocHomeView(myoc.window, myoc.sent, now) !== null)
    const memberWidgets = widgets.filter((w) => !w.adminOnly && (w.id !== "myoc" || showMyoc))
    const committeeWidgets = isCommittee ? widgets.filter((w) => w.adminOnly) : []

    const change = (next: HomePrefs) => {
        setPrefs(next)
        saveHomePrefs(storage(), userId, next)
        toast.show("Home updated")
    }

    return (
        <Screen
            title="Home"
            brandHeader
            width="full"
            trailing={
                <div className="-mr-2 flex items-center">
                    <Link to="/app/profile" aria-label="You" className="grid size-11 place-items-center rounded-full">
                        <Avatar id={memberId ?? userId} name={name || "You"} src={imageUrl} size={32} ring="pebble" decorative />
                    </Link>
                    <button type="button" aria-label="Customize Home" onClick={() => setCustomizing(true)} className="grid size-11 place-items-center rounded-full text-label cursor-pointer">
                        <SlidersHorizontal aria-hidden className="size-5" />
                    </button>
                </div>
            }
        >
            <div className="mx-auto max-w-[1280px]">
                <p className="mb-4 text-title-1 sm:text-large-title">{name ? `Hey ${name}.` : "Hey."}</p>
                {totalFailure && <ErrorState title="Couldn't load Home" body="Check your connection and try again." onRetry={state.reload} />}
                <div className={GRID}>
                    {!totalFailure && memberWidgets.map((w) => (
                        <div key={w.id} className={`h-full [&>section]:h-full min-w-0 ${w.span === 2 ? "col-span-2" : ""}`}>
                            <HomeWidget id={w.id} state={state} now={now} memberId={memberId} />
                        </div>
                    ))}
                </div>
                {!totalFailure && committeeWidgets.length > 0 && (
                    <div role="group" aria-label="Committee" className="mt-10">
                        <p className="mb-3 text-title-3 uppercase tracking-wider">Committee</p>
                        <div className={GRID}>
                            {committeeWidgets.map((w) => (
                                <div key={w.id} className={`h-full [&>section]:h-full min-w-0 ${w.span === 2 ? "col-span-2" : ""}`}>
                                    <HomeWidget id={w.id} state={state} now={now} memberId={memberId} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <FirstRunGuide open={!guideSeen && !hold} onClose={closeGuide} season={state.data?.season ?? null} />
            <CustomizeHomeSheet open={customizing} onClose={() => setCustomizing(false)} prefs={prefs} isCommittee={isCommittee} released={released} onChange={change} />
        </Screen>
    )
}

const HomePage = () => {
    const { user } = useAuth()
    const { profile, member, loading } = useUserData()
    const skipKey = `jsc.profileSetupSkipped.${user?.id ?? ""}`
    const [skipped, setSkipped] = useState(() => {
        try {
            return localStorage.getItem(skipKey) === "1"
        } catch {
            return false
        }
    })
    useEffect(() => {
        try {
            setSkipped(localStorage.getItem(skipKey) === "1")
        } catch {
            // ignore
        }
    }, [skipKey])
    const handleProfileSetupSkip = () => {
        try {
            localStorage.setItem(skipKey, "1")
        } catch {
            // storage unavailable; skip lasts this session only
        }
        setSkipped(true)
    }

    // Derived, never stored: the prompt shows only while the loaded profile has no photo and it was not skipped.
    const needsPhoto = shouldAskForPhoto(loading, profile, skipped)
    const profileSetupComplete = !needsPhoto

    return (
        <>
            {loading ? (
                <Screen title="Home" brandHeader>
                    <SkeletonScreen label="Loading Home">
                        <div className="space-y-3">
                            <Skeleton shape="block" />
                            <Skeleton shape="card" />
                        </div>
                    </SkeletonScreen>
                </Screen>
            ) : (
                <HomeBody userId={user?.id ?? ""} isCommittee={Boolean(profile?.is_committee)} name={firstName(member?.name ?? profile?.display_name)} memberId={member?.id} imageUrl={profile?.image_url} hold={!profileSetupComplete} />
            )}
            <ProfileSetup open={!profileSetupComplete} onComplete={() => {}} onSkip={handleProfileSetupSkip} />
        </>
    )
}

export default HomePage
