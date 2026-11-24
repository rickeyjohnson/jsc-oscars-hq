import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Plus, Trophy } from "lucide-react"
import { useUserData } from "../../context/UserContenxt"
import { addAward, fetchAwards, removeAward, renameAward, type TrophyAward } from "../../api/trophies"
import { failureMessage } from "../../lib/failure"
import { buildShelf, chunk, PER_SHELF, type Trophy as TrophyItem } from "../../lib/labs/shelf"
import type { StatsModel } from "../../lib/statsLab"
import { Button } from "../../ui/Button"
import { EmptyState } from "../../ui/EmptyState"
import { Screen } from "../../ui/Screen"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { TextField } from "../../ui/TextField"
import { useToast } from "../../ui/Toast"
import { fieldCls } from "../../components/committee/ActionSheet"
import { StatsGate } from "../stats/StatsGate"
import { useStatsData } from "../stats/useStatsData"

const OTHER = "__other__"

const EDGE = 8
const TOP_SAFE = 72 // keep clear of the page header when the bubble sits above the trophy

/** A small bubble over (or, near the top of the screen, under) its trophy. It slides sideways to stay on screen; the arrow still points at the trophy. */
function Bubble({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [pos, setPos] = useState<{ shift: number; below: boolean }>({ shift: 0, below: false })
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        // r is measured at shift 0 above the trophy
        const vw = document.documentElement.clientWidth
        const shift = r.left < EDGE ? EDGE - r.left : r.right > vw - EDGE ? vw - EDGE - r.right : 0
        setPos({ shift: Math.round(shift), below: r.top < TOP_SAFE })
    }, [])
    return (
        <div
            ref={ref}
            role="status"
            style={{ transform: `translateX(calc(-50% + ${pos.shift}px))` }}
            className={`absolute left-1/2 z-10 w-36 rounded-control bg-inverse px-2.5 py-2 text-center text-on-inverse shadow-lg ${pos.below ? "top-full mt-2" : "bottom-full mb-2"}`}
        >
            {children}
            <span
                aria-hidden
                style={{ left: `calc(50% - ${pos.shift}px)` }}
                className={`absolute size-2 -translate-x-1/2 rotate-45 bg-inverse ${pos.below ? "-top-1" : "-bottom-1"}`}
            />
        </div>
    )
}

type Editing = { mode: "add"; semester: string } | { mode: "name"; semester: string } | { mode: "rename"; semester: string; id: string; award: string }

function Shelf({ model, memberId }: { model: StatsModel; memberId: string }) {
    const toast = useToast()
    const [awards, setAwards] = useState<TrophyAward[]>([])
    const [active, setActive] = useState<string | null>(null)
    const [editing, setEditing] = useState<Editing | null>(null)
    const [name, setName] = useState("")
    const [sem, setSem] = useState("")
    const [custom, setCustom] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(() => {
        fetchAwards().then(setAwards).catch((e) => console.error(e))
    }, [])
    useEffect(load, [load])

    const trophies = buildShelf(model, memberId, awards)
    const shelves = chunk(trophies, PER_SHELF)
    const semesters = [...model.sems].reverse().map((s) => s.label)

    const open = (e: Editing) => {
        setEditing(e)
        setName(e.mode === "rename" ? e.award : "")
        setSem(e.mode === "add" ? (semesters[0] ?? OTHER) : e.semester)
        setCustom("")
        setError(null)
        setActive(null)
    }
    const semester = sem === OTHER ? custom.trim() : sem
    const ready = name.trim().length > 0 && (editing?.mode === "rename" || semester.length > 0)

    const save = async () => {
        if (!editing || !ready) return
        setBusy(true)
        setError(null)
        try {
            if (editing.mode === "rename") await renameAward(editing.id, name)
            else await addAward(memberId, semester, name)
            setEditing(null)
            load()
            toast.show("Saved to your shelf")
        } catch (e) {
            console.error(e)
            setError(failureMessage("save this award", e))
        } finally {
            setBusy(false)
        }
    }
    const remove = async (id: string) => {
        try {
            await removeAward(id)
            setActive(null)
            load()
            toast.show("Removed")
        } catch (e) {
            console.error(e)
            toast.show(failureMessage("remove this award", e))
        }
    }

    const bubble = (t: TrophyItem) => (
        <Bubble>
            <p className="text-footnote font-bold leading-tight">{t.award ?? "Unnamed award"}</p>
            <p className="text-caption-2 opacity-80">{t.semester}</p>
            <div className="mt-1.5 flex justify-center gap-3 text-caption-2 font-bold underline">
                {t.awardId ? (
                    <>
                        <button type="button" className="cursor-pointer" onClick={() => open({ mode: "rename", semester: t.semester, id: t.awardId as string, award: t.award ?? "" })}>
                            Rename
                        </button>
                        <button type="button" className="cursor-pointer" onClick={() => void remove(t.awardId as string)}>
                            Remove
                        </button>
                    </>
                ) : (
                    <button type="button" className="cursor-pointer" onClick={() => open({ mode: "name", semester: t.semester })}>
                        Name it
                    </button>
                )}
            </div>
        </Bubble>
    )

    return (
        <div className="space-y-4">
            <p className="text-callout text-label-2">Only you can see this shelf. Tap a trophy to see its award.</p>
            {shelves.length === 0 ? (
                <EmptyState icon={Trophy} title="No trophies yet" body="Your wins show up here. You can also add an award yourself." />
            ) : (
                <div className="space-y-6 rounded-card bg-surface p-4 pt-6">
                    {shelves.map((row, r) => (
                        <div key={r} className="border-b-8 border-pebble-tangerine/70 pb-0.5">
                            <ul className="grid list-none grid-cols-5 items-end gap-1 p-0">
                                {row.map((t) => (
                                    <li key={t.key} className="relative flex justify-center">
                                        <button
                                            type="button"
                                            aria-label={`${t.award ?? "Trophy"}, ${t.semester}`}
                                            aria-expanded={active === t.key}
                                            onClick={() => setActive(active === t.key ? null : t.key)}
                                            className="grid min-h-11 min-w-11 cursor-pointer place-items-end rounded-control pb-0.5 focus-visible:outline-2 focus-visible:outline-accent"
                                        >
                                            <Trophy aria-hidden className={`size-10 ${t.award ? "text-pebble-lemon" : "text-pebble-lemon/70"}`} strokeWidth={2} />
                                        </button>
                                        {active === t.key && bubble(t)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
            <Button variant="secondary" size="md" icon={<Plus aria-hidden className="size-4" />} onClick={() => open({ mode: "add", semester: semesters[0] ?? "" })}>
                Add an award
            </Button>

            <Sheet
                open={editing !== null}
                onClose={() => setEditing(null)}
                title={editing?.mode === "rename" ? "Rename award" : editing?.mode === "name" ? "Name this award" : "Add an award"}
                fit
                footer={
                    <SheetActions>
                        <Button fullWidth loading={busy} disabled={!ready} onClick={() => void save()}>
                            Save
                        </Button>
                    </SheetActions>
                }
            >
                <div className="space-y-4">
                    <TextField label="Award" value={name} maxLength={80} placeholder="Best Dressed" onChange={(e) => setName(e.target.value)} />
                    {editing?.mode === "add" ? (
                        <>
                            <div>
                                <label htmlFor="award-sem" className="mb-1.5 block text-subhead font-bold text-label-2">
                                    Semester
                                </label>
                                <select id="award-sem" value={sem} onChange={(e) => setSem(e.target.value)} className={fieldCls}>
                                    {semesters.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                    <option value={OTHER}>Other…</option>
                                </select>
                            </div>
                            {sem === OTHER && <TextField label="Semester or year" value={custom} maxLength={40} placeholder="Fall 2022" onChange={(e) => setCustom(e.target.value)} />}
                        </>
                    ) : (
                        <p className="text-callout text-label-2">{editing?.semester}</p>
                    )}
                    {error && (
                        <p role="alert" className="text-callout text-danger">
                            {error}
                        </p>
                    )}
                </div>
            </Sheet>
        </div>
    )
}

/** Your own trophy shelf: one trophy per win, on rows of shelves. Tap one for its award; name them or add your own. Private to you. */
const TrophyShelf = () => {
    const { member } = useUserData()
    const { load, reload } = useStatsData()
    return (
        <Screen title="Trophy shelf" back={{ to: "/app/profile", label: "You" }}>
            {!member ? <p className="text-callout text-label-2">Loading…</p> : <StatsGate load={load} reload={reload}>{({ model }) => <Shelf model={model} memberId={member.id} />}</StatsGate>}
        </Screen>
    )
}

export default TrophyShelf
