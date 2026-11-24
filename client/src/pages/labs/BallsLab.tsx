import FallingProfileBallsPhysics from "../../components/FallingProfileBallPhysics"
import { Screen } from "../../ui/Screen"

/** The landing page's ball pit (same photos, same physics), inside a page so you can play with it. */
const BallsLab = () => {
    const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    return (
        <Screen title="Balls" back={{ to: "/app/profile", label: "You" }}>
            <p className="mb-3 text-callout text-label-2">{reduced ? "Motion is off, so the balls are resting. Turn off Reduce motion in Settings to play." : "Everyone, one pit. Drag to toss them around."}</p>
            <div className="relative h-[calc(100dvh-16rem)] min-h-[360px] overflow-hidden rounded-card bg-surface">
                <FallingProfileBallsPhysics contained />
            </div>
        </Screen>
    )
}

export default BallsLab
