import { useRef, type KeyboardEvent } from "react"
import { motion } from "motion/react"
import { spring } from "./motion"
import { nextSegment } from "./logic/segmented"

export function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    idPrefix,
}: {
    label: string
    options: { value: T; label: string; /** Still tappable, just quieter (e.g. a tab with nothing in it). */ muted?: boolean }[]
    value: T
    onChange: (v: T) => void
    idPrefix: string
}) {
    const refs = useRef<(HTMLButtonElement | null)[]>([])
    const current = Math.max(0, options.findIndex((o) => o.value === value))
    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        const next = nextSegment(current, e.key, options.length)
        if (next === null) return
        e.preventDefault()
        onChange(options[next].value)
        refs.current[next]?.focus()
    }
    return (
        <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="inline-flex w-full rounded-full bg-fill p-1">
            {options.map((o, i) => {
                const selected = i === current
                return (
                    <button
                        key={o.value}
                        ref={(el) => {
                            refs.current[i] = el
                        }}
                        type="button"
                        role="tab"
                        id={`${idPrefix}-tab-${o.value}`}
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(o.value)}
                        className={`relative flex-1 min-h-11 rounded-full px-4 text-subhead font-bold select-none cursor-pointer transition-colors ${selected ? "text-on-inverse" : o.muted ? "text-label-3" : "text-label-2"}`}
                    >
                        {selected && <motion.span layoutId={`${idPrefix}-thumb`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-inverse" />}
                        <span className="relative">{o.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
