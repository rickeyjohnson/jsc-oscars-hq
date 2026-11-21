import { useEffect, useRef } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Mail, MailOpen } from "lucide-react"
import { Button } from "./Button"
import { spring } from "./motion"
import { vibrate } from "./haptics"

/** Full-bleed lemon "the envelope is open" moment. Skippable with the button or Escape; never traps. */
export function Envelope({ onDone, progress }: { onDone: () => void; progress?: number }) {
    const reduce = useReducedMotion()
    const root = useRef<HTMLDivElement>(null)
    // `progress` freezes the animation (gallery); undefined plays it once.
    const frozen = progress !== undefined
    const open = frozen ? progress >= 0.5 : true

    useEffect(() => {
        root.current?.querySelector("button")?.focus()
        if (!frozen) vibrate("reveal")
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onDone()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [onDone, frozen])

    const Icon = open ? MailOpen : Mail
    return (
        <div ref={root} role="dialog" aria-modal="true" aria-labelledby="envelope-title" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-pebble-lemon px-gutter text-center text-on-pebble-lemon">
            <motion.div
                aria-hidden
                initial={reduce || frozen ? false : { scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: frozen ? 0.6 + 0.4 * (progress ?? 1) : 1, opacity: 1, rotate: 0 }}
                transition={reduce ? { duration: 0 } : spring.podium}
            >
                <Icon className="size-32" strokeWidth={1.5} />
            </motion.div>
            <h2 id="envelope-title" className="font-display text-large-title">
                The envelope is open
            </h2>
            <Button variant="primary" size="lg" onClick={onDone}>
                See the winners
            </Button>
        </div>
    )
}
