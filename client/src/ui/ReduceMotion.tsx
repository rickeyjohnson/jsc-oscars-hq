import { useEffect, useState, type ReactNode } from "react"
import { MotionConfig } from "motion/react"
import { loadReduceMotion, saveReduceMotion } from "./logic/motionPref"

const EVENT = "jsc:reduce-motion"
const store = (): Storage | null => {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

/** Wraps the app: honors the in-app "Reduce motion" setting on top of the OS preference. */
export function ReduceMotionProvider({ children }: { children: ReactNode }) {
    const [on, setOn] = useState(() => loadReduceMotion(store()))
    useEffect(() => {
        const h = () => setOn(loadReduceMotion(store()))
        window.addEventListener(EVENT, h)
        return () => window.removeEventListener(EVENT, h)
    }, [])
    useEffect(() => {
        document.documentElement.toggleAttribute("data-reduce-motion", on)
    }, [on])
    return <MotionConfig reducedMotion={on ? "always" : "user"}>{children}</MotionConfig>
}

export function useReduceMotionSetting(): [boolean, (v: boolean) => void] {
    const [on, setOn] = useState(() => loadReduceMotion(store()))
    return [
        on,
        (v) => {
            saveReduceMotion(store(), v)
            setOn(v)
            window.dispatchEvent(new Event(EVENT))
        },
    ]
}
