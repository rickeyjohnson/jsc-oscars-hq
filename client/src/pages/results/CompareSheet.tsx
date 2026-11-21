import { useState } from "react"
import { Swords } from "lucide-react"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { Button } from "../../ui/Button"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { useMemberPebble } from "../../ui/useMemberPebble"
import { PEBBLE_CLASS } from "../../ui/logic/pebble"
import { CompareChart } from "../../ui/charts/StatsCharts"
import { COPY } from "../../ui/copy"
import { APPROX_MARK, compareMembers, fmtRate, hasStats, nameOf, totals, type StatsModel } from "../../lib/statsLab"

function Picker({ label, model, ids, value, other, onPick }: { label: string; model: StatsModel; ids: string[]; value: string; other: string; onPick: (id: string) => void }) {
    return (
        <div>
            <p className="mb-1 text-caption-1 uppercase tracking-wider text-label-2">{label}</p>
            <div role="group" aria-label={label} className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
                {ids.map((id) => (
                    <button
                        key={id}
                        type="button"
                        aria-pressed={id === value}
                        disabled={id === other}
                        onClick={() => onPick(id)}
                        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-subhead font-bold cursor-pointer transition-colors disabled:cursor-default disabled:opacity-40 ${id === value ? "bg-inverse text-on-inverse" : "bg-fill text-label-2"}`}
                    >
                        <MemberAvatar memberId={id} name={nameOf(model, id)} size={24} decorative />
                        {nameOf(model, id)}
                    </button>
                ))}
            </div>
        </div>
    )
}

/** Head to head: per-semester win rates side by side. The edge only counts semesters both were in; under 2 shared semesters there is no verdict. */
export function CompareSheet({ open, onClose, model, ranked, viewerId }: { open: boolean; onClose: () => void; model: StatsModel; /** Member ids with stats, best first. */ ranked: string[]; viewerId: string | null }) {
    const pebbleOf = useMemberPebble()
    const ids = ranked.filter((id) => hasStats(model, id))
    const firstA = viewerId && ids.includes(viewerId) ? viewerId : (ids[0] ?? "")
    const [a, setA] = useState(firstA)
    const [b, setB] = useState(ids.find((id) => id !== firstA) ?? "")
    const enough = ids.length >= 2 && a && b
    const cmp = enough ? compareMembers(model, a, b) : null
    const nameA = a ? nameOf(model, a) : ""
    const nameB = b ? nameOf(model, b) : ""
    const ta = a ? totals(model, a) : null
    const tb = b ? totals(model, b) : null
    const tilde = (on: boolean) => (on ? APPROX_MARK : "")
    const rows: [string, string, string][] =
        ta && tb
            ? [
                  ["Wins", String(ta.wins), String(tb.wins)],
                  ["Noms", `${tilde(ta.approx)}${ta.noms}`, `${tilde(tb.approx)}${tb.noms}`],
                  ["Win rate", `${tilde(ta.approx)}${fmtRate(ta.rate)}`, `${tilde(tb.approx)}${fmtRate(tb.rate)}`],
                  ["Semesters in", String(ta.sem), String(tb.sem)],
              ]
            : []
    return (
        <Sheet open={open} onClose={onClose} title="Compare two members" footer={<SheetActions><Button onClick={onClose}>{COPY.done}</Button></SheetActions>}>
            {!cmp ? (
                <p className="py-6 text-callout text-label-2">Head to head needs at least 2 members with nominations.</p>
            ) : (
                <div className="space-y-4">
                    <Picker label="Member A" model={model} ids={ids} value={a} other={b} onPick={setA} />
                    <Picker label="Member B" model={model} ids={ids} value={b} other={a} onPick={setB} />
                    <p className="flex flex-wrap gap-x-4 text-footnote text-label-2">
                        <span><span aria-hidden className={`mr-1.5 inline-block size-2.5 rounded-sm align-middle opacity-60 ${PEBBLE_CLASS[pebbleOf(a, nameA)].bg}`} />{nameA}</span>
                        <span><span aria-hidden className={`mr-1.5 inline-block size-2.5 rounded-sm align-middle ${PEBBLE_CLASS[pebbleOf(b, nameB)].bg}`} />{nameB}</span>
                    </p>
                    <div className="min-h-56"><CompareChart sems={model.sems} series={cmp.series} a={{ name: nameA, pebble: pebbleOf(a, nameA) }} b={{ name: nameB, pebble: pebbleOf(b, nameB) }} /></div>
                    <table className="w-full border-collapse text-callout">
                        <thead className="sr-only">
                            <tr><th scope="col">Stat</th><th scope="col">{nameA}</th><th scope="col">{nameB}</th></tr>
                        </thead>
                        <tbody>
                            {rows.map(([label, x, y]) => (
                                <tr key={label} className="border-t border-sep">
                                    <th scope="row" className="py-2 text-left font-normal text-label-2">{label}</th>
                                    <td className="py-2 text-center font-bold tabular-nums">{x}</td>
                                    <td className="py-2 text-center font-bold tabular-nums">{y}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="flex items-start gap-3 text-callout">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bg"><Swords aria-hidden className="size-4" /></span>
                        <span>
                            {cmp.verdict === null ? (
                                <>Only {cmp.shared} shared semester{cmp.shared === 1 ? "" : "s"}. Head to head needs at least 2.</>
                            ) : (
                                <>
                                    <b>{cmp.verdict === "even" ? "Dead even." : `${cmp.verdict === "a" ? nameA : nameB} has the edge.`}</b> {nameA} had the higher win rate in {cmp.aEdge} of {cmp.shared} shared semesters, {nameB} in {cmp.bEdge}.
                                </>
                            )}
                        </span>
                    </p>
                </div>
            )}
        </Sheet>
    )
}
