import { useEffect, useState } from "react"
import { reopenBallot } from "../../api/ballots"
import { closeTimeProblem, localDateTimeInput, reopenMessage } from "../../lib/reopen"
import { toUtcIso } from "../../lib/time"
import { ActionSheet, CloseTimeField } from "./ActionSheet"

// Reopen a closed ballot: new close time (default +24h), and what it does to votes and results.
export function ReopenSheet({ open, onClose, ballotId, ballotName, voteCount, onDone }: { open: boolean; onClose: () => void; ballotId: string; ballotName: string; voteCount: number; onDone: () => void }) {
    const [closesAt, setClosesAt] = useState(() => localDateTimeInput(new Date()))
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    useEffect(() => {
        if (open) {
            setClosesAt(localDateTimeInput(new Date()))
            setError(null)
        }
    }, [open])

    const confirm = async () => {
        const problem = closeTimeProblem(closesAt, new Date())
        if (problem) return setError(problem)
        setBusy(true)
        setError(null)
        try {
            await reopenBallot(ballotId, toUtcIso(closesAt))
            onDone()
        } catch (e) {
            console.error(e)
            setError(reopenMessage(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <ActionSheet open={open} onClose={onClose} title={`Reopen ${ballotName}?`} confirmLabel="Reopen ballot" danger onConfirm={confirm} busy={busy} error={error}>
            <p className="text-callout text-label-2">
                Members can vote and change their votes again until the new close time. The {voteCount} {voteCount === 1 ? "vote" : "votes"} already cast are kept.
            </p>
            <p className="text-callout text-label-2">The results recorded from this ballot are cleared and recorded again when it closes. Nothing is revealed to members either way.</p>
            <CloseTimeField label="Voting closes" value={closesAt} onChange={setClosesAt} />
        </ActionSheet>
    )
}
