import { COLORS, CONTRAST_PAIRS, PEBBLE_COLORS, type PebbleName } from "../../ui/tokens"
import { contrastRatio } from "../../ui/logic/contrast"
import { PEBBLES, PEBBLE_CLASS } from "../../ui/logic/pebble"

const varOf = (ref: string) =>
    ref.startsWith("pebble:") ? `var(--pebble-${ref.slice(7)})` : ref.startsWith("on:") ? `var(--on-pebble-${ref.slice(3)})` : `var(--${ref})`

const valueOf = (ref: string): string => {
    if (ref.startsWith("pebble:")) return PEBBLE_COLORS[ref.slice(7) as PebbleName].bg
    if (ref.startsWith("on:")) return PEBBLE_COLORS[ref.slice(3) as PebbleName].on
    return COLORS[ref as keyof typeof COLORS]
}

const ON_FOR: Record<string, string> = {
    accent: "on-accent",
    inverse: "on-inverse",
    gold: "on-gold",
    silver: "on-silver",
    bronze: "on-bronze",
}

const SURFACES = ["bg", "surface", "surface-2", "elevated"] as const
const PODIUM = ["gold", "silver", "bronze"] as const
const ROLES = Object.keys(COLORS).filter((k) => !k.startsWith("on-"))

const FOCUS_STYLE = { outline: "2px solid var(--accent)", outlineOffset: "2px", boxShadow: "0 0 0 2px var(--bg)" } as const

function Heading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-headline mb-3">{children}</h3>
}

export default function Foundations() {
    return (
        <div className="space-y-10">
            <div>
                <Heading>Pebbles</Heading>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {PEBBLES.map((p) => (
                        <div key={p} className={`${PEBBLE_CLASS[p].bg} ${PEBBLE_CLASS[p].text} rounded-card p-3 min-w-0`}>
                            <p className="text-headline">{p}</p>
                            <p className="text-footnote">Aa on-color</p>
                            <p className="text-caption-1">
                                {contrastRatio(PEBBLE_COLORS[p].on, PEBBLE_COLORS[p].bg).toFixed(2)}:1
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <Heading>Surfaces and roles</Heading>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SURFACES.map((s) => (
                        <div key={s} className="rounded-card p-3 border border-sep min-w-0" style={{ background: varOf(s) }}>
                            <p className="text-headline">{s}</p>
                            <p className="text-footnote text-label-2">label-2 sample</p>
                            <p className="text-caption-1 text-label-3">{COLORS[s]}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                    {ROLES.filter((r) => !(SURFACES as readonly string[]).includes(r)).map((r) => {
                        const on = ON_FOR[r]
                        return (
                            <div key={r} className="rounded-control p-3 border border-sep min-w-0" style={{ background: varOf(r), color: on ? varOf(on) : undefined }}>
                                <p className="text-footnote break-words">{r}</p>
                                {on && <p className="text-caption-1">on-color</p>}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div>
                <Heading>Podium</Heading>
                <div className="grid grid-cols-3 gap-3">
                    {PODIUM.map((p) => (
                        <div key={p} className="rounded-card p-3 min-w-0" style={{ background: varOf(p), color: varOf(`on-${p}`) }}>
                            <p className="text-headline">{p}</p>
                            <p className="text-caption-1">{contrastRatio(COLORS[`on-${p}`], COLORS[p]).toFixed(2)}:1</p>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <Heading>Contrast pairs (dark palette, live)</Heading>
                <div className="grid gap-2 md:grid-cols-2">
                    {CONTRAST_PAIRS.map((pair) => {
                        const ratio = contrastRatio(valueOf(pair.fg), valueOf(pair.bg))
                        const ok = ratio >= pair.min
                        return (
                            <div key={`${pair.fg}|${pair.bg}`} className="flex items-center gap-3 rounded-control p-2 min-w-0" style={{ background: varOf(pair.bg) }}>
                                <span className="text-headline shrink-0" style={{ color: varOf(pair.fg) }}>
                                    Aa
                                </span>
                                <span className="text-caption-1 min-w-0 break-words flex-1" style={{ color: varOf(pair.fg) }}>
                                    {pair.fg} on {pair.bg}
                                    {pair.note ? ` (${pair.note})` : ""}
                                </span>
                                <span className="text-caption-1 shrink-0 rounded-full px-2 bg-bg text-label" data-pass={ok}>
                                    {ratio.toFixed(2)} / {pair.min} {ok ? "pass" : "FAIL"}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div>
                <Heading>Materials over a photo strip</Heading>
                <div className="relative h-40 rounded-card overflow-hidden bg-linear-to-r from-pebble-strawberry via-pebble-sky to-pebble-lime">
                    <div className="absolute inset-x-3 top-3 material-bar rounded-control px-3 py-2 text-footnote">material-bar</div>
                    <div className="absolute inset-x-3 bottom-3 material-sheet rounded-sheet px-3 py-3 text-footnote">material-sheet</div>
                    <div className="absolute right-3 top-14 material-scrim rounded-control px-3 py-2 text-footnote">scrim</div>
                </div>
            </div>

            <div>
                <Heading>Focus ring</Heading>
                <div className="flex flex-wrap gap-4 p-2">
                    {[...PEBBLES, "cream"].map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={`size-12 rounded-full ${p === "cream" ? "bg-label" : PEBBLE_CLASS[p as PebbleName].bg}`}
                            style={FOCUS_STYLE}
                            aria-label={`${p} with focus ring`}
                        />
                    ))}
                    <button type="button" className="rounded-control px-4 py-2 bg-pebble-lemon text-on-pebble-lemon text-headline" style={FOCUS_STYLE}>
                        Lemon
                    </button>
                    <button type="button" className="rounded-control px-4 py-2 bg-pebble-lime text-on-pebble-lime text-headline" style={FOCUS_STYLE}>
                        Lime
                    </button>
                </div>
                <p className="text-footnote text-label-2">Tab to any control on this page to see the real :focus-visible ring.</p>
            </div>

            <div>
                <Heading>Spacing, radius, elevation</Heading>
                <div className="flex flex-wrap gap-3 items-end mb-4">
                    {[4, 8, 12, 16, 24, 32].map((n) => (
                        <div key={n} className="text-caption-1 text-label-2">
                            <div className="bg-accent mb-1" style={{ width: n, height: n }} />
                            {n}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-4 mb-4">
                    {[
                        ["control", "rounded-control"],
                        ["card", "rounded-card"],
                        ["sheet", "rounded-sheet"],
                    ].map(([n, c]) => (
                        <div key={n} className={`${c} bg-surface-2 size-24 grid place-items-center text-footnote`}>
                            {n}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-4 p-2">
                    <div className="rounded-card bg-surface shadow-e1 size-24 grid place-items-center text-footnote border border-sep">e1</div>
                    <div className="rounded-card bg-elevated shadow-e2 size-24 grid place-items-center text-footnote">e2</div>
                </div>
            </div>
        </div>
    )
}
