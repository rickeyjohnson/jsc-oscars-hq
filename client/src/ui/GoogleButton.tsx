import { motion } from "motion/react"
import { PRESS_SCALE } from "./motion"

// Four-color "G" built from pebble tokens (no external assets).
function GoogleG() {
    return (
        <svg aria-hidden viewBox="0 0 24 24" className="size-5">
            <path className="fill-pebble-sky" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" />
            <path className="fill-pebble-lime" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5z" />
            <path className="fill-pebble-lemon" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z" />
            <path className="fill-pebble-cherry" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4z" />
        </svg>
    )
}

/** Light pill, 44px+ target. The caller decides whether to render it (VITE_GOOGLE_AUTH). */
export function GoogleButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={loading}
            whileTap={loading ? undefined : { scale: PRESS_SCALE }}
            className="bg-inverse text-on-inverse text-headline focus-visible:ring-accent inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full px-6 font-bold outline-none focus-visible:ring-2 disabled:opacity-60"
        >
            <GoogleG />
            Continue with Google
        </motion.button>
    )
}
