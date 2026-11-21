import { useCallback, useEffect, useRef, useState } from "react"
import { Clapperboard } from "lucide-react"
import { fetchCurrentSeason } from "../../api/ballots"
import { fetchSeasonResults } from "../../api/results"
import { fetchMemberAvatars } from "../../api/members"
import { useUserData } from "../../context/UserContenxt"
import { buildResultCards, type ResultCard } from "../../lib/resultsView"
import type { Season } from "../../types"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { ErrorState } from "../../ui/ErrorState"
import { Countdown } from "../../ui/Countdown"
import { Envelope } from "../../ui/Envelope"
import { COPY } from "../../ui/copy"
import { useReleaseWatch } from "../../ui/useReleaseWatch"
import { hasSeenEnvelope, markEnvelopeSeen, safeStorage } from "../../ui/logic/reveal"
import { WinnersView } from "./WinnersView"

type Load =
    | { state: "loading" }
    | { state: "error" }
    | { state: "sealed"; season: Season }
    | { state: "none" }
    | { state: "ready"; season: Season; released: boolean; cards: ResultCard[]; avatars: Record<string, string | null> }

/** Winners: this season's results. Sealed for members until the committee releases them; nothing is requested before that. */
export function WinnersPane() {
    const { profile, loading: userLoading } = useUserData()
    const isCommittee = Boolean(profile?.is_committee)
    const [load, setLoad] = useState<Load>({ state: "loading" })
    const [envelopeDone, setEnvelopeDone] = useState(false)
    const seq = useRef(0)

    const run = useCallback(async () => {
        const mine = ++seq.current
        setLoad({ state: "loading" })
        try {
            const season = await fetchCurrentSeason()
            if (mine !== seq.current) return
            if (!season) {
                setLoad({ state: "none" })
                return
            }
            const released = season.results_released_at != null
            // Members request nothing about results before release (season row only).
            if (!released && !isCommittee) {
                setLoad({ state: "sealed", season })
                return
            }
            const [{ categories, results }, avatars] = await Promise.all([fetchSeasonResults(season.id), fetchMemberAvatars().catch(() => ({}) as Record<string, string | null>)])
            if (mine !== seq.current) return
            setLoad({ state: "ready", season, released, cards: buildResultCards(categories, results), avatars })
        } catch (e) {
            if (mine !== seq.current) return
            console.error("Error loading results: ", e)
            setLoad({ state: "error" })
        }
    }, [isCommittee])

    useEffect(() => {
        if (userLoading) return
        void run()
    }, [run, userLoading])

    // A member waiting on the sealed screen sees the reveal without reloading.
    useReleaseWatch(load.state === "sealed", () => void run())

    if (load.state === "loading") {
        return (
            <SkeletonScreen label="Loading results">
                <div className="space-y-4">
                    <Skeleton shape="row" />
                    <Skeleton shape="card" />
                    <Skeleton shape="card" />
                </div>
            </SkeletonScreen>
        )
    }
    if (load.state === "error") return <ErrorState title={COPY.somethingWrong} body={COPY.loadFailed("the results")} onRetry={() => void run()} />
    if (load.state === "none" || load.state === "sealed") {
        const at = load.state === "sealed" && load.season.ceremony_at ? new Date(load.season.ceremony_at) : null
        return (
            <section className="rounded-card border-l-4 border-pebble-lemon bg-surface p-5">
                <Clapperboard aria-hidden className="size-10 text-pebble-lemon" />
                <h2 className="mt-3 font-display text-title-1">Results are sealed.</h2>
                <p className="mt-1 text-callout">
                    {at
                        ? `The winners are revealed at the ceremony on ${at.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at ${at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
                        : "The winners are revealed at the ceremony."}
                </p>
                <p className="mt-2 text-callout text-label-2">Nothing to see yet. Cast your votes, then come back on ceremony night to find out who won and how you did.</p>
                <div className="mt-4">
                    <Countdown target={at} />
                </div>
            </section>
        )
    }

    const { season, released } = load
    const showEnvelope = released && !envelopeDone && !hasSeenEnvelope(safeStorage(), season.id)
    const closeEnvelope = () => {
        markEnvelopeSeen(safeStorage(), season.id)
        setEnvelopeDone(true)
    }
    return (
        <div className="space-y-4">
            {showEnvelope && <Envelope onDone={closeEnvelope} />}
            {!released && (
                <p role="status" className="rounded-card border-l-4 border-pebble-lemon bg-surface p-3 text-callout">
                    Preview: members can't see this yet. Nothing is revealed until you open the envelope.
                </p>
            )}
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
                <h2 className="font-display text-large-title">And the winners are…</h2>
            </div>
            <WinnersView cards={load.cards} avatars={load.avatars} />
        </div>
    )
}
