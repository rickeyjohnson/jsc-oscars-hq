import type { Season } from "../types"
import { IntroSheet, Tip } from "../ui/IntroSheet"
import { ceremonyDate, ceremonyTime } from "./home/format"

function ceremonyLine(season: Season | null): string {
    if (!season?.ceremony_at) return "The ceremony date is coming soon. We'll show it on Home."
    const at = new Date(season.ceremony_at)
    const where = season.location ? ` at ${season.location}` : ""
    return `Join us at the ceremony on ${ceremonyDate(at)} at ${ceremonyTime(at)}${where}.`
}

/** A short three-card tour for new members. Reopened from Settings, shown once after the first Home. */
export function FirstRunGuide({ open, onClose, season }: { open: boolean; onClose: () => void; season: Season | null }) {
    return (
        <IntroSheet
            open={open}
            onClose={onClose}
            title="How it works"
            slides={[
                {
                    title: "What this is",
                    content: (
                        <>
                            <p>Every semester we hand out our own Oscars. Vote for your friends in fun categories, then watch the winners get revealed.</p>
                            <p>{ceremonyLine(season)}</p>
                        </>
                    ),
                },
                {
                    title: "How voting works",
                    content: (
                        <ul className="list-none space-y-2 p-0">
                            <Tip>You get one category per page. Tap a nominee to vote.</Tip>
                            <Tip>Some nominees are groups. You can't vote for yourself or a group you're in.</Tip>
                            <Tip>Skip a category and come back later.</Tip>
                            <Tip>Change your votes any time until the ballot closes.</Tip>
                            <Tip>Submit when you're done.</Tip>
                        </ul>
                    ),
                },
                {
                    title: "Results and Make Your Own Categories",
                    content: (
                        <>
                            <p>The committee reveals the winners on ceremony night. After that you can see your own stats.</p>
                            <p>Got an idea for a category? Suggest it in Settings, under Make Your Own Categories.</p>
                        </>
                    ),
                },
            ]}
        />
    )
}
