import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { Button } from "../../ui/Button"
import { COPY } from "../../ui/copy"
import { MIN_RATE_NOMS_ALL, MIN_RATE_NOMS_SEM } from "../../lib/statsLab"

const TERMS: { term: string; text: string }[] = [
    { term: "What counts", text: "A nomination is being in the top 3 of a category by votes. A win is finishing first. Group votes count for each person in the group. Live-voting categories are not included. Fall 23 and Fall 24 were counted from the slides, so their nominations are a little low (marked ~)." },
    { term: "Win rate", text: `Wins divided by nominations. Shown as a dash when there are no nominations. Rankings need at least ${MIN_RATE_NOMS_ALL} nominations all time (${MIN_RATE_NOMS_SEM} in one semester) so a 2-of-3 semester can't top the board.` },
    { term: "Group average", text: "Everyone's wins divided by everyone's nominations that semester. It is the dashed line on the trend." },
    { term: "Expected wins", text: "Your nominations times the group win rate that semester, added up over the semesters you were in. Win more than that and you are over performing. Within half a win either way is on par." },
    { term: "Top X%", text: "Your rank divided by the number of ranked members, rounded up. 3rd of 13 is Top 24%. Ties share the better rank." },
    { term: "Semesters you were not in", text: "Shown as a dash. They are never treated as zero and no line is drawn across them." },
    { term: "Current season", text: "Hidden for everyone until its results are released, then it counts right away." },
]

export function HowCalculatedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Sheet open={open} onClose={onClose} title="How these are calculated" fit footer={<SheetActions><Button onClick={onClose}>{COPY.done}</Button></SheetActions>}>
            <dl className="space-y-4">
                {TERMS.map((t) => (
                    <div key={t.term}>
                        <dt className="text-subhead font-bold">{t.term}</dt>
                        <dd className="m-0 mt-0.5 text-callout text-label-2">{t.text}</dd>
                    </div>
                ))}
            </dl>
        </Sheet>
    )
}
