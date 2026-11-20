import { Inbox, Plus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { Avatar } from "../../ui/Avatar"
import { AvatarStack } from "../../ui/AvatarStack"
import { ColorBlock } from "../../ui/ColorBlock"
import { Card } from "../../ui/Card"
import { GroupedSection } from "../../ui/GroupedSection"
import { ListRow } from "../../ui/ListRow"
import { Switch } from "../../ui/Switch"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { PEBBLES } from "../../ui/logic/pebble"
import type { ButtonSize, ButtonVariant, ChipTone } from "../../ui/logic/variants"

const VARIANTS: ButtonVariant[] = ["primary", "pebble", "secondary", "tinted", "destructive", "plain"]
const SIZES: ButtonSize[] = ["lg", "md", "sm"]
const TONES: ChipTone[] = ["neutral", "success", "warn", "danger", "gold", "strawberry", "cherry", "tangerine", "lemon", "lime", "sky"]
const PEOPLE = ["Micah", "Ann Lee", "Nick, Rickey", "anthony", "Mary Jane Watson", "Zed"].map((name, i) => ({ id: `m${i}-${name}`, name }))
// Placeholder photo: an inline SVG data URI built from nothing but shapes (no color literals).
const PHOTO = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='gray'/%3E%3Ccircle cx='5' cy='4' r='2' fill='white'/%3E%3C/svg%3E"

function H({ children }: { children: ReactNode }) {
    return <h3 className="text-headline mb-3">{children}</h3>
}

const STATES: { label: string; props: Record<string, unknown> }[] = [
    { label: "idle", props: {} },
    { label: "hover", props: { "data-hover": "" } },
    { label: "pressed", props: { "data-pressed": "" } },
    { label: "disabled", props: { disabled: true } },
    { label: "loading", props: { loading: true, loadingLabel: "Working…" } },
]

export default function PrimitivesA() {
    const [on, setOn] = useState(false)
    return (
        <>
            <div className="space-y-10">
                <div>
                    <H>Buttons (variant x size x state)</H>
                    <p className="text-footnote text-label-2 mb-3">Real hover appears only on a hover-capable pointer. The hover and pressed columns are forced with data attributes.</p>
                    <div className="space-y-6 overflow-x-auto">
                        {VARIANTS.map((v) => (
                            <div key={v} className="space-y-2">
                                <p className="text-footnote text-label-2">{v}</p>
                                {SIZES.map((s) => (
                                    <div key={s} className="flex flex-wrap items-center gap-3">
                                        <span className="w-8 text-caption-1 text-label-3">{s}</span>
                                        {STATES.map((st) => (
                                            <Button key={st.label} variant={v} pebble={v === "pebble" ? "sky" : undefined} size={s} {...st.props}>
                                                {st.label}
                                            </Button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                        <div className="flex flex-wrap gap-3 items-center">
                            <Button icon={<Plus aria-hidden className="size-5" />}>With icon</Button>
                            <Button to="/somewhere" variant="secondary">Link button</Button>
                        </div>
                        <Button fullWidth variant="pebble" pebble="lime">Full width</Button>
                    </div>
                </div>

                <div>
                    <H>Chips</H>
                    <div className="flex flex-wrap gap-2">
                        {TONES.map((t) => (
                            <Chip key={t} tone={t}>{t}</Chip>
                        ))}
                        <Chip tone="sky" icon={<Plus aria-hidden className="size-3" />}>with icon</Chip>
                    </div>
                </div>

                <div>
                    <H>Avatars</H>
                    <div className="flex flex-wrap items-end gap-4">
                        {([24, 32, 40, 56, 72, 96] as const).map((s) => (
                            <Avatar key={s} id="m-Micah" name="Micah" size={s} />
                        ))}
                    </div>
                    <div className="flex flex-wrap items-end gap-4 mt-4">
                        <Avatar id="p1" name="Photo Person" src={PHOTO} size={56} />
                        <Avatar id="p2" name="Broken Image" src="/missing.jpg" size={56} />
                        <Avatar id="p3" name="Struck Name" size={56} struck />
                        {(["bg", "gold", "silver", "bronze", "lemon"] as const).map((r) => (
                            <Avatar key={r} id={`r-${r}`} name={r} size={56} ring={r} />
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-6 mt-4">
                        <AvatarStack people={PEOPLE} />
                        <AvatarStack people={PEOPLE.slice(0, 3)} size={24} />
                    </div>
                </div>

                <div>
                    <H>Color blocks (all seven pebbles)</H>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {PEBBLES.map((p) =>
                            p === "grape" ? (
                                <ColorBlock key={p} pebble={p} title="Grape: headline only" />
                            ) : (
                                <ColorBlock key={p} pebble={p} eyebrow={p} title="Best Picture">
                                    <p className="text-subhead mt-1">Supporting text on a pebble.</p>
                                </ColorBlock>
                            ),
                        )}
                        <ColorBlock pebble="sky" to="/x" eyebrow="link" title="Tappable block" />
                    </div>
                </div>

                <div>
                    <H>Card and grouped list</H>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <p className="text-headline">Card</p>
                            <p className="text-callout text-label-2">Plain surface container.</p>
                        </Card>
                        <GroupedSection header="Settings" footer="Footer explains the group.">
                            <ListRow title="Static row" subtitle="Subtitle" />
                            <ListRow title="Link row" to="/x" chevron leading={<Avatar id="a" name="Ann" size={32} decorative />} />
                            <ListRow title="Button row" onClick={() => {}} trailing={<Chip tone="lime">Open</Chip>} />
                            <ListRow title="Selected row" onClick={() => {}} selected />
                            <ListRow title="Delete account" onClick={() => {}} destructive />
                        </GroupedSection>
                    </div>
                </div>

                <div>
                    <H>Switch</H>
                    <div className="flex items-center gap-4">
                        <Switch checked={on} onChange={setOn} label="Countdown" />
                        <Switch checked label="Always on" onChange={() => {}} />
                        <span className="text-footnote text-label-2">{on ? "on" : "off"}</span>
                    </div>
                </div>

                <div>
                    <H>Skeletons</H>
                    <SkeletonScreen label="Loading ballots">
                        <div className="space-y-3 max-w-md">
                            <Skeleton shape="line" width="60%" />
                            <div className="flex gap-3 items-center">
                                <Skeleton shape="circle" />
                                <Skeleton shape="row" />
                            </div>
                            <Skeleton shape="block" />
                            <Skeleton shape="card" />
                        </div>
                    </SkeletonScreen>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <H>Empty state</H>
                        <EmptyState icon={Inbox} title="No ballots yet" body="Votes you cast will show up here." action={<Button size="md">Start voting</Button>} />
                    </div>
                    <div>
                        <H>Error state</H>
                        <ErrorState title="Couldn't load ballots" body="Check your connection and try again." onRetry={() => {}} />
                    </div>
                </div>
            </div>
        </>
    )
}
