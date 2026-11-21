import { useState } from "react"
import { Button } from "../../ui/Button"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import ExportCsvButton from "./ExportCsvButton"
import { WinnerPicker } from "./WinnerPicker"
import { Chip } from "../../ui/Chip"
import type { Phase } from "../../lib/ballotFlow"
import type { CategoryView } from "../../lib/tallyView"
import type { BallotSummary } from "../../lib/voting"
import type { Nominee, ResultRow } from "../../types"

const DECIDED_BY: Record<string, string> = { votes: "by votes", tiebreak: "by tiebreak", committee_vote: "by committee", manual: "picked by hand" }
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

export type CsvEntry = { ballot: BallotSummary; label: string; detail: string }

type Props = {
    phase: Phase
    views: CategoryView[]
    results: Record<string, ResultRow>
    nameOf: (id: string) => string
    finishedLine: string
    csvs: CsvEntry[]
    // categories where one committee member enters the winner, with their choices
    toEnter: { view: CategoryView; options: Nominee[] }[]
    // every other nominee a recorded winner could be replaced with
    replaceOptions: (v: CategoryView) => Nominee[]
    editable: boolean
    busy: boolean
    // resolves true when saved; asks for confirmation itself
    onSaveWinner: (v: CategoryView, nomineeId: string) => Promise<boolean>
    enterRef?: string
}

export default function ResultsSection({ phase, views, results, nameOf, finishedLine, csvs, toEnter, replaceOptions, editable, busy, onSaveWinner, enterRef }: Props) {
    const [open, setOpen] = useState(false)
    const [picks, setPicks] = useState<Record<string, string>>({})
    const [replacing, setReplacing] = useState<CategoryView | null>(null)
    const [replacePick, setReplacePick] = useState<string | null>(null)

    const ended = phase === "closed" || phase === "released"
    const decided = views.filter((v) => v.recordedWinnerId)
    const needs = views.filter((v) => !v.recordedWinnerId)
    const by = (k: string) => decided.filter((v) => v.recordedBy === k).length
    const split = [by("votes") && `${by("votes")} by votes`, by("tiebreak") && `${by("tiebreak")} by tiebreak`, by("committee_vote") && `${by("committee_vote")} by committee`, by("manual") && `${by("manual")} picked by hand`].filter(Boolean).join(" · ")

    const tallyLine = (v: CategoryView) => (v.tally.ranked.length === 0 ? "No votes" : v.tally.ranked.slice(0, 3).map((r) => `${nameOf(r.nominee_id)} ${r.votes}`).join(" · "))

    return (
        <section aria-label="Results" className="space-y-3">
            <h2 className="text-caption-2 font-bold uppercase tracking-wider text-label-2">Results</h2>
            {!ended ? (
                <p className="text-callout text-label-2">Counts appear when voting closes. {finishedLine} Exporting the votes so far is safe any time.</p>
            ) : (
                <>
                    <div>
                        <p className="text-title-3">{decided.length} of {views.length} winners</p>
                        {split && <p className="text-subhead text-label-2">{split}</p>}
                    </div>

                    {needs.length > 0 && (
                        <ul aria-label="Needs you" className="list-none divide-y divide-sep overflow-hidden rounded-card bg-surface p-0">
                            {needs.map((v) => (
                                <li key={v.category_id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-callout font-bold">{v.name}</p>
                                        <p className="truncate text-footnote text-label-2">{tallyLine(v)}</p>
                                    </div>
                                    <Chip tone={v.step === "manual" ? "cherry" : "tangerine"}>{v.step === "manual" ? "Pick needed" : v.step === "committee" ? "Committee" : "Tied"}</Chip>
                                </li>
                            ))}
                        </ul>
                    )}

                    {toEnter.length > 0 && (
                        <div id={enterRef} tabIndex={-1} className="scroll-mt-24 space-y-4 outline-none">
                            <h3 className="text-headline">Enter the winner</h3>
                            {toEnter.map(({ view: v, options }) => (
                                <div key={v.category_id} className="space-y-2">
                                    <p className="text-callout font-bold">{v.name}</p>
                                    <WinnerPicker label={`Winner for ${v.name}`} options={options} value={picks[v.category_id] ?? null} onChange={(id) => setPicks((p) => ({ ...p, [v.category_id]: id }))} />
                                    <Button
                                        variant="primary"
                                        size="md"
                                        fullWidth
                                        disabled={busy || !picks[v.category_id]}
                                        onClick={async () => {
                                            if (await onSaveWinner(v, picks[v.category_id])) setPicks((p) => ({ ...p, [v.category_id]: "" }))
                                        }}
                                    >
                                        Save winner for {v.name}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {decided.length > 0 && (
                        <div>
                            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-11 w-full items-center justify-between rounded-card bg-surface px-4 text-callout font-bold">
                                <span>{plural(decided.length, "winner")} decided</span>
                                <span aria-hidden>{open ? "−" : "+"}</span>
                            </button>
                            {open && (
                                <ul className="mt-2 list-none divide-y divide-sep overflow-hidden rounded-card bg-surface p-0">
                                    {decided.map((v) => (
                                        <li key={v.category_id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-callout font-bold">{v.name}</p>
                                                <p className="truncate text-footnote text-label-2">{nameOf(v.recordedWinnerId!)}{v.recordedBy ? ` · ${DECIDED_BY[v.recordedBy]}` : ""}</p>
                                            </div>
                                            {editable && (
                                                <Button variant="dangerOutline" size="sm" aria-label={`Replace winner for ${v.name}`} onClick={() => { setReplacing(v); setReplacePick(null) }}>
                                                    Replace winner
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </>
            )}

            {csvs.length > 0 && (
                <div>
                    <h3 className="mb-1 text-caption-2 font-bold uppercase tracking-wider text-label-2">Export CSV</h3>
                    <ul className="list-none divide-y divide-sep overflow-hidden rounded-card bg-surface p-0">
                        {csvs.map((c) => (
                            <li key={c.ballot.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-callout font-bold">{c.label}</p>
                                    <p className="truncate text-footnote text-label-2">{c.detail}</p>
                                </div>
                                <ExportCsvButton ballotId={c.ballot.id} ballotName={c.ballot.name} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Sheet
                open={replacing !== null}
                onClose={() => setReplacing(null)}
                title={replacing ? `Replace the ${replacing.name} winner?` : "Replace winner"}
                fit
                footer={
                    <SheetActions>
                        <Button
                            variant="destructive"
                            size="md"
                            fullWidth
                            disabled={busy || !replacePick}
                            onClick={async () => {
                                if (replacing && replacePick && (await onSaveWinner(replacing, replacePick))) setReplacing(null)
                            }}
                        >
                            Replace winner
                        </Button>
                    </SheetActions>
                }
            >
                {replacing && (
                    <div className="space-y-3">
                        <p className="text-callout text-label-2">
                            {replacing.name} is recorded as {nameOf(replacing.recordedWinnerId ?? "")}{results[replacing.category_id]?.decided_by ? ` (${DECIDED_BY[results[replacing.category_id].decided_by!]})` : ""}. Pick who should win instead. Members see nothing until you reveal.
                        </p>
                        <WinnerPicker label={`New winner for ${replacing.name}`} options={replaceOptions(replacing)} value={replacePick} onChange={setReplacePick} />
                    </div>
                )}
            </Sheet>
        </section>
    )
}
