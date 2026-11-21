import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Lightbulb } from "lucide-react"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchMyocWindows } from "../../api/myoc"
import { myocErrorKind, MYOC_LOAD_FAILED, MYOC_UNAVAILABLE, pickWindow, windowPhase, type MyocWindow } from "../../lib/myoc"
import type { Season } from "../../types"
import { useUserData } from "../../context/UserContenxt"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { Screen } from "../../ui/Screen"
import { SegmentedControl } from "../../ui/SegmentedControl"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { COPY } from "../../ui/copy"
import { fade } from "../../ui/motion"
import { ReviewView } from "../../components/myoc/ReviewView"
import { SuggestView } from "../../components/myoc/SuggestView"
import { WindowView } from "../../components/myoc/WindowView"

type Tab = "mine" | "review" | "window"
const TABS: { value: Tab; label: string }[] = [
    { value: "mine", label: "My ideas" },
    { value: "review", label: "Review" },
    { value: "window", label: "Window" },
]
type Load = { status: "loading" } | { status: "unavailable" } | { status: "error" } | { status: "ready"; season: Season | null; windows: MyocWindow[] }

const useNow = (ms = 30_000): Date => {
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), ms)
        return () => clearInterval(t)
    }, [ms])
    return now
}

/** Settings > MYOC. Everyone suggests; the committee also gets Review and Window tabs (RLS is the real gate). */
const MyocPage = () => {
    const { profile } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const [params, setParams] = useSearchParams()
    const reduce = useReducedMotion()
    const now = useNow()
    const [load, setLoad] = useState<Load>({ status: "loading" })
    const [reload, setReload] = useState(0)

    useEffect(() => {
        let live = true
        void (async () => {
            try {
                const season = await fetchCurrentSeason()
                const windows = season ? await fetchMyocWindows(season.id) : []
                if (live) setLoad({ status: "ready", season, windows })
            } catch (e) {
                console.error(e)
                if (live) setLoad({ status: myocErrorKind(e) === "unavailable" ? "unavailable" : "error" })
            }
        })()
        return () => {
            live = false
        }
    }, [reload])

    const asked = params.get("tab")
    const tab: Tab = isCommittee && (asked === "review" || asked === "window") ? asked : "mine"
    const setTab = (t: Tab) => setParams(t === "mine" ? {} : { tab: t }, { replace: true })

    let body
    if (load.status === "loading") {
        body = (
            <SkeletonScreen label="Loading MYOC">
                <div className="space-y-2">
                    <Skeleton shape="block" />
                    <Skeleton shape="row" />
                </div>
            </SkeletonScreen>
        )
    } else if (load.status === "unavailable") {
        body = <EmptyState icon={Lightbulb} title={MYOC_UNAVAILABLE} body="The committee is still setting it up." />
    } else if (load.status === "error") {
        body = (
            <ErrorState
                title={COPY.somethingWrong}
                body={MYOC_LOAD_FAILED}
                onRetry={() => {
                    setLoad({ status: "loading" })
                    setReload((k) => k + 1)
                }}
            />
        )
    } else {
        const w = pickWindow(load.windows, now)
        const phase = windowPhase(w, now)
        body = (
            <div className="space-y-4">
                {isCommittee && <SegmentedControl label="MYOC view" idPrefix="myoc" options={TABS} value={tab} onChange={setTab} />}
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={tab} role="tabpanel" aria-labelledby={isCommittee ? `myoc-tab-${tab}` : undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduce ? { duration: 0 } : fade}>
                        {tab === "mine" && <SuggestView window={w} phase={phase} now={now} />}
                        {tab === "review" && <ReviewView window={w} phase={phase} />}
                        {tab === "window" && <WindowView season={load.season} window={w} phase={phase} now={now} onChanged={() => setReload((k) => k + 1)} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        )
    }

    return (
        <Screen title="MYOC" back={{ to: "/app/profile/settings", label: "Settings" }} width="wide">
            {body}
        </Screen>
    )
}

export default MyocPage
