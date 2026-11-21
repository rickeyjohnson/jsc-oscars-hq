import { useEffect, useState } from "react"
import { createMyocWindow, updateMyocWindow } from "../../api/myoc"
import { closesLabel, myocMessage, windowProblem, type MyocWindow, type WindowPhase } from "../../lib/myoc"
import { localDateTimeInput } from "../../lib/reopen"
import { toUtcIso } from "../../lib/time"
import type { Season } from "../../types"
import { Button } from "../../ui/Button"
import { useConfirm } from "../../ui/ConfirmProvider"
import { useToast } from "../../ui/Toast"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { CloseTimeField } from "../committee/ActionSheet"

const FIVE_DAYS = 120

/** Committee: open a window, change its times, or close it now. Closing early just moves closes_at to now. */
export function WindowView({ season, window: w, phase, now, onChanged }: { season: Season | null; window: MyocWindow | null; phase: WindowPhase; now: Date; onChanged: () => void }) {
    const toast = useToast()
    const confirm = useConfirm()
    const editing = w !== null && (phase === "open" || phase === "upcoming")
    const start = () => ({
        opens: editing && w ? localDateTimeInput(new Date(w.opens_at), 0) : localDateTimeInput(new Date(), 0),
        closes: editing && w ? localDateTimeInput(new Date(w.closes_at), 0) : localDateTimeInput(new Date(), FIVE_DAYS),
    })
    const [times, setTimes] = useState(start)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const key = `${w?.id ?? ""}:${phase}`
    useEffect(() => {
        setTimes(start())
        setError(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])

    if (!season) return <p className="rounded-card bg-surface p-4 text-callout text-label-2">There is no season yet, so there is nothing to open MYOC for.</p>

    const save = async () => {
        const problem = windowProblem(times.opens, times.closes, new Date())
        if (problem) return setError(problem)
        setBusy(true)
        setError(null)
        try {
            if (editing && w) {
                await updateMyocWindow(w.id, { opens_at: toUtcIso(times.opens), closes_at: toUtcIso(times.closes) })
                toast.show("Times saved")
            } else {
                await createMyocWindow(season.id, times.opens, times.closes)
                toast.show("MYOC window created")
            }
            onChanged()
        } catch (e) {
            console.error(e)
            setError(myocMessage(e))
        } finally {
            setBusy(false)
        }
    }

    const closeNow = async () => {
        if (!w) return
        const ok = await confirm({ title: "Close MYOC now?", message: "Members can't send, edit or withdraw ideas after this. You can still review everything.", confirmLabel: "Close MYOC", destructive: true })
        if (!ok) return
        setBusy(true)
        try {
            await updateMyocWindow(w.id, { closes_at: new Date().toISOString() })
            toast.show("MYOC closed")
            onChanged()
        } catch (e) {
            console.error(e)
            setError(myocMessage(e))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-4 lg:max-w-[520px]">
            <section aria-label="Window status" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE[phase === "open" ? "lime" : phase === "upcoming" ? "sky" : "grape"]}`}>
                <p className="text-caption-2 font-bold uppercase tracking-wider text-label-2">{season.name}</p>
                <h2 className="mt-1 text-headline">{phase === "open" ? "MYOC is open" : phase === "upcoming" ? "MYOC is scheduled" : phase === "closed" ? "MYOC is closed" : "No MYOC window yet"}</h2>
                {w && phase === "open" && <p className="mt-1 text-callout text-label-2">{closesLabel(w, now)}</p>}
            </section>
            <form
                aria-label="MYOC window times"
                className="space-y-4 rounded-card bg-surface p-4"
                onSubmit={(e) => {
                    e.preventDefault()
                    void save()
                }}
            >
                <CloseTimeField label="Opens" value={times.opens} onChange={(opens) => setTimes((t) => ({ ...t, opens }))} />
                <CloseTimeField label="Closes" value={times.closes} onChange={(closes) => setTimes((t) => ({ ...t, closes }))} />
                {error && (
                    <p role="alert" className="text-callout text-danger">
                        {error}
                    </p>
                )}
                <Button type="submit" variant="primary" size="md" fullWidth loading={busy} loadingLabel="Saving…">
                    {editing ? "Save times" : "Open MYOC window"}
                </Button>
                {phase === "open" && (
                    <Button variant="dangerOutline" size="md" fullWidth disabled={busy} onClick={() => void closeNow()}>
                        Close now
                    </Button>
                )}
            </form>
            <p className="px-1 text-footnote text-label-2">Members can send as many ideas as they like until it closes. Other members never see each other's ideas.</p>
        </div>
    )
}
