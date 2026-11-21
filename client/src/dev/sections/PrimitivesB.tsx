import { useState, type ReactNode } from "react"
import { Button } from "../../ui/Button"
import { SegmentedControl } from "../../ui/SegmentedControl"
import { ToastProvider, useToast } from "../../ui/Toast"
import { ProgressStrip } from "../../ui/ProgressStrip"
import { Countdown } from "../../ui/Countdown"
import { Podium, type PodiumItem } from "../../ui/Podium"
import { HoldButton } from "../../ui/HoldButton"
import { Skeleton } from "../../ui/Skeleton"

const noop = () => {}
const PHOTO = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='gray'/%3E%3Ccircle cx='5' cy='4' r='2' fill='white'/%3E%3C/svg%3E"
const DAY = 86_400_000

function H({ children }: { children: ReactNode }) {
    return <h3 className="text-headline mb-3">{children}</h3>
}

const STATES = Array.from({ length: 30 }, (_, i) => ({ voted: i < 8, current: i === 8 }))
const LABELS = STATES.map((_, i) => `Category ${i + 1}`)

const THREE: PodiumItem[] = [
    { key: "a", slot: 1, name: "Ann Lee", sub: "14 votes", avatarUrl: PHOTO },
    { key: "b", slot: 2, name: "Micah", sub: "9 votes", avatarUrl: PHOTO },
    { key: "c", slot: 3, name: "Nick, Rickey", sub: "7 votes" },
]
const TIES: PodiumItem[] = [
    { key: "a", slot: 1, name: "Ann Lee", tag: "tied 1st", avatarUrl: PHOTO },
    { key: "b", slot: 1, name: "Micah", tag: "tied 1st", avatarUrl: PHOTO },
    { key: "c", slot: 3, name: "Zed" },
]
const NO_THIRD: PodiumItem[] = [
    { key: "a", slot: 1, name: "Ann Lee" },
    { key: "b", slot: 2, name: "Micah" },
]

function ToastDemo() {
    const t = useToast()
    return (
        <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="md" onClick={() => t.show("Vote saved")}>Info toast</Button>
            <Button variant="secondary" size="md" onClick={() => t.show("Category skipped", { actionLabel: "Undo", onAction: noop })}>Undo toast</Button>
            <Button variant="secondary" size="md" onClick={() => t.show("You are offline. Votes will sync later.", { persistent: true })}>Persistent toast</Button>
        </div>
    )
}

function Hold({ progress, ...rest }: { progress: number; ready?: boolean; busy?: boolean; label?: string; hint: string }) {
    return <HoldButton ready busy={false} label="Hold to submit" onDown={noop} onMove={noop} onUp={noop} onCancel={noop} progress={progress} {...rest} />
}

export default function PrimitivesB() {
    const [seg, setSeg] = useState<"mine" | "leaderboard">("mine")
    const [seg3, setSeg3] = useState("a")
    const now = Date.now()
    return (
        <ToastProvider>
            <div className="space-y-10">
                <div>
                    <H>Segmented control</H>
                    <div className="max-w-sm space-y-4">
                        <SegmentedControl label="View" idPrefix="seg2" value={seg} onChange={setSeg} options={[{ value: "mine", label: "My picks" }, { value: "leaderboard", label: "Leaderboard" }]} />
                        <SegmentedControl label="Group" idPrefix="seg3" value={seg3} onChange={setSeg3} options={[{ value: "a", label: "All" }, { value: "b", label: "Open" }, { value: "c", label: "Closed" }]} />
                    </div>
                </div>

                <div>
                    <H>Skeleton shapes</H>
                    <div className="flex max-w-sm flex-col gap-3">
                        <Skeleton shape="line" />
                        <Skeleton shape="row" />
                        <div className="flex items-center gap-3">
                            <Skeleton shape="circle" />
                            <Skeleton shape="line" />
                        </div>
                    </div>
                </div>

                <div>
                    <H>Toast</H>
                    <ToastDemo />
                    <p className="mt-2 text-footnote text-label-2">One at a time; a new toast replaces the visible one. Info and undo dismiss after 4s.</p>
                </div>

                <div>
                    <H>Progress strip (cream dashes)</H>
                    <div className="space-y-6">
                        <div>
                            <p className="mb-2 text-footnote text-label-2">Horizontal, 375px wide: one jump button</p>
                            <div className="w-[375px] max-w-full"><ProgressStrip states={STATES} labels={LABELS} onJump={noop} onOpenJump={noop} /></div>
                        </div>
                        <div>
                            <p className="mb-2 text-footnote text-label-2">Horizontal, 1040px wide: a button per dash</p>
                            <div className="w-[1040px] max-w-full overflow-x-auto"><ProgressStrip states={STATES} labels={LABELS} onJump={noop} onOpenJump={noop} /></div>
                        </div>
                        <div>
                            <p className="mb-2 text-footnote text-label-2">Vertical (desktop vote pane)</p>
                            <div className="h-80"><ProgressStrip orientation="vertical" states={STATES} labels={LABELS} onJump={noop} onOpenJump={noop} /></div>
                        </div>
                    </div>
                </div>

                <div>
                    <H>Countdown</H>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {[
                            ["No date", null],
                            ["Scheduled", new Date(now + 12 * DAY + 4 * 3_600_000 + 31 * 60_000)],
                            ["Tonight", new Date(now + 3_600_000)],
                            ["Live", new Date(now - 1000)],
                        ].map(([label, d]) => (
                            <div key={label as string} className="rounded-card bg-surface p-5">
                                <p className="mb-2 text-caption-1 text-label-3">{label as string}</p>
                                <Countdown target={d as Date | null} />
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-footnote text-label-2">The Tonight sample reads "Today" only while the target falls on the same calendar day as now; late in the day it shows the scheduled form.</p>
                </div>

                <div>
                    <H>Podium</H>
                    <div className="space-y-8">
                        {(
                            [
                                ["Card, three places", THREE, "card"],
                                ["Card, tie for 1st, no 2nd", TIES, "card"],
                                ["Card, missing 3rd", NO_THIRD, "card"],
                                ["Hero, three places", THREE, "hero"],
                                ["Hero, tie", TIES, "hero"],
                            ] as const
                        ).map(([label, items, variant]) => (
                            <div key={label} className="max-w-xl">
                                <p className="mb-2 text-footnote text-label-2">{label}</p>
                                <div className="rounded-card bg-surface p-5"><Podium items={[...items]} variant={variant} animate /></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <H>Hold button (one mono style)</H>
                    <div className="max-w-sm space-y-6">
                        <div><p className="mb-2 text-footnote text-label-2">Idle</p><Hold progress={0} hint="Press and hold for 3 seconds" /></div>
                        <div><p className="mb-2 text-footnote text-label-2">50%, label inverts across the fill</p><Hold progress={0.5} hint="Press and hold for 3 seconds" /></div>
                        <div><p className="mb-2 text-footnote text-label-2">Busy</p><Hold progress={1} busy label="Release" hint="Releasing the results" /></div>
                        <div>
                            <p className="mb-2 text-footnote text-label-2">Disabled, with reasons</p>
                            <Hold progress={0} ready={false} hint="2 checks still failing" />
                            <ul className="mt-2 space-y-1 text-center text-footnote text-warn">
                                <li>3 categories have no nominees</li>
                                <li>Voting has not closed</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </ToastProvider>
    )
}
