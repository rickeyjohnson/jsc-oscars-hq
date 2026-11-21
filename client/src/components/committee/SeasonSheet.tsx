import { useEffect, useState } from "react"
import { fetchCurrentSeason, updateSeason } from "../../api/ballots"
import { formatCeremony, SEASON_TZ, utcToZonedInput, zonedToUtcIso } from "../../lib/ceremony"
import { ActionSheet, CloseTimeField, fieldCls } from "./ActionSheet"
import type { Season } from "../../types"

const LOAD_FAILED = "Couldn't load the season. Check your connection and try again."
const SAVE_FAILED = "Couldn't save the season. Check your connection and try again."
const NO_RIGHT = "Saving was refused: this account can't edit the season. Ask whoever runs the database to check the committee update rights on seasons."

// Committee: the season's name, ceremony time (shown and edited in Eastern time) and place. Home, the countdown and Results read these.
export function SeasonSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [season, setSeason] = useState<Season | null>(null)
    const [name, setName] = useState("")
    const [at, setAt] = useState("")
    const [location, setLocation] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!open) return
        let live = true
        setError(null)
        setSaved(false)
        fetchCurrentSeason()
            .then((s) => {
                if (!live) return
                setSeason(s)
                setName(s?.name ?? "")
                setAt(s?.ceremony_at ? utcToZonedInput(s.ceremony_at) : "")
                setLocation(s?.location ?? "")
            })
            .catch((e) => {
                console.error(e)
                if (live) setError(LOAD_FAILED)
            })
        return () => {
            live = false
        }
    }, [open])

    const save = async () => {
        if (!season) return
        const iso = at ? zonedToUtcIso(at) : null
        if (at && !iso) return setError("Pick a valid date and time")
        if (!name.trim()) return setError("Give the season a name")
        setBusy(true)
        setError(null)
        try {
            const ok = await updateSeason(season.id, { name: name.trim(), ceremony_at: iso, location: location.trim() || null })
            if (!ok) return setError(NO_RIGHT)
            setSeason({ ...season, name: name.trim(), ceremony_at: iso, location: location.trim() || null })
            setSaved(true)
        } catch (e) {
            console.error(e)
            setError(/permission|policy|42501/i.test(String((e as { message?: string })?.message)) ? NO_RIGHT : SAVE_FAILED)
        } finally {
            setBusy(false)
        }
    }

    return (
        <ActionSheet open={open} onClose={onClose} title="Season" confirmLabel="Save season" onConfirm={save} busy={busy} disabled={!season} error={error}>
            <p className="text-callout text-label-2">
                Saved ceremony time:{" "}
                <span className="font-bold text-label">{season?.ceremony_at ? formatCeremony(season.ceremony_at) : "not set"}</span>
            </p>
            <div>
                <label htmlFor="season-name" className="mb-1.5 block text-subhead font-bold text-label-2">Season name</label>
                <input id="season-name" value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
            </div>
            <CloseTimeField label="Ceremony time (Eastern time, America/New_York)" value={at} onChange={(v) => { setAt(v); setSaved(false) }} />
            <div>
                <label htmlFor="season-location" className="mb-1.5 block text-subhead font-bold text-label-2">Where</label>
                <input id="season-location" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldCls} />
            </div>
            <p className="text-footnote text-label-2">Times are entered in {SEASON_TZ.replace("_", " ")} and shown to members in their own time.</p>
            {saved && <p role="status" className="text-callout text-success">Saved. Home, the countdown and Results now use this.</p>}
        </ActionSheet>
    )
}
