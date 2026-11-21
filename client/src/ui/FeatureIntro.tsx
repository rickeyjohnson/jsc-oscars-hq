import { IntroSheet, Tip, type IntroSlide } from "./IntroSheet"
import type { IntroDef } from "./logic/featureIntros"

const slidesOf = (intro: IntroDef): IntroSlide[] =>
    intro.cards.map((c) => ({
        title: c.title,
        content: (
            <>
                {c.body?.map((t) => <p key={t}>{t}</p>)}
                {c.points && (
                    <ul className="list-none space-y-2 p-0">
                        {c.points.map((t) => <Tip key={t}>{t}</Tip>)}
                    </ul>
                )}
            </>
        ),
    }))

/** One feature's short tour, in the same sheet as the welcome guide. */
export function FeatureIntro({ intro, open, onClose }: { intro: IntroDef; open: boolean; onClose: () => void }) {
    return <IntroSheet open={open} onClose={onClose} title={intro.title} slides={slidesOf(intro)} />
}
