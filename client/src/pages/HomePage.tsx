import { useEffect, useMemo, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import ProfileSetup from "../components/ProfileSetup"
import { useAuth } from "../context/AuthContext"
import { useUserData } from "../context/UserContenxt"
import { supabase } from "../supabaseClient"
import { Screen } from "../ui/Screen"
import { Skeleton, SkeletonScreen } from "../ui/Skeleton"
import { useToast } from "../ui/Toast"
import { loadHomePrefs, saveHomePrefs, type HomePrefs } from "../ui/logic/homePrefs"
import { resolveWidgets } from "../ui/logic/homeWidgets"
import { CustomizeHomeSheet } from "./home/CustomizeHomeSheet"
import { firstName } from "./home/format"
import { useHomeData } from "./home/useHomeData"
import { HomeWidget } from "./home/widgets"

const storage = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

const GRID = "grid grid-flow-dense grid-cols-1 items-stretch gap-3 lg:grid-cols-2 min-[1400px]:grid-cols-3"

const HomeBody = ({ userId, isCommittee, name, memberId }: { userId: string; isCommittee: boolean; name: string; memberId?: string }) => {
    const state = useHomeData(isCommittee)
    const toast = useToast()
    const [prefs, setPrefs] = useState<HomePrefs>(() => loadHomePrefs(storage(), userId, isCommittee))
    const [customizing, setCustomizing] = useState(false)
    const released = Boolean(state.data?.released)
    const widgets = useMemo(() => resolveWidgets(prefs, { isCommittee, released }), [prefs, isCommittee, released])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const now = useMemo(() => new Date(), [state.data])

    const memberWidgets = widgets.filter((w) => !w.adminOnly)
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
                <button
                    type="button"
                    aria-label="Customize Home"
                    onClick={() => setCustomizing(true)}
                    className="-mr-2 grid size-11 place-items-center rounded-full text-label cursor-pointer"
                >
                    <SlidersHorizontal aria-hidden className="size-5" />
                </button>
            }
        >
            <div className="mx-auto max-w-[1280px]">
                <p className="mb-4 text-large-title">{name ? `Hey ${name}.` : "Hey."}</p>
                <div className={GRID}>
                    {memberWidgets.map((w) => (
                        <div key={w.id} className={`h-full [&>section]:h-full ${w.span === 2 ? "lg:col-span-2" : ""}`}>
                            <HomeWidget id={w.id} state={state} now={now} memberId={memberId} />
                        </div>
                    ))}
                </div>
                {committeeWidgets.length > 0 && (
                    <div role="group" aria-label="Committee" className="mt-10">
                        <p className="mb-3 text-title-3 uppercase tracking-wider">Committee</p>
                        <div className={GRID}>
                            {committeeWidgets.map((w) => (
                                <div key={w.id} className={`h-full [&>section]:h-full ${w.span === 2 ? "lg:col-span-2" : ""}`}>
                                    <HomeWidget id={w.id} state={state} now={now} memberId={memberId} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <CustomizeHomeSheet open={customizing} onClose={() => setCustomizing(false)} prefs={prefs} isCommittee={isCommittee} onChange={change} />
        </Screen>
    )
}

const HomePage = () => {
    const { user } = useAuth()
    const { profile, member, loading } = useUserData()
    const [profileSetupComplete, setProfileSetupComplete] = useState<boolean | null>(true)

    const skipKey = `jsc.profileSetupSkipped.${user?.id ?? ""}`
    const handleProfileSetupSkip = () => {
        try {
            localStorage.setItem(skipKey, "1")
        } catch {
            // storage unavailable; skip lasts this session only
        }
        setProfileSetupComplete(true)
    }

    const handleProfileSetupComplete = () => {
        setProfileSetupComplete(true)
    }

    useEffect(() => {
        const isProfileComplete = async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("image_url")
                .eq("user_id", user?.id ?? "")
                .single()

            if (error) {
                console.error("Error fetching if profile is complete: ", error.message)
                setProfileSetupComplete(true)
                return
            }

            let skipped = false
            try {
                skipped = localStorage.getItem(`jsc.profileSetupSkipped.${user?.id ?? ""}`) === "1"
            } catch {
                // ignore
            }
            setProfileSetupComplete(skipped || data?.image_url !== null)
        }

        isProfileComplete()
    }, [user?.id])

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
                <HomeBody userId={user?.id ?? ""} isCommittee={Boolean(profile?.is_committee)} name={firstName(member?.name ?? profile?.display_name)} memberId={member?.id} />
            )}
            <ProfileSetup open={!profileSetupComplete} onComplete={handleProfileSetupComplete} onSkip={handleProfileSetupSkip} />
        </>
    )
}

export default HomePage
