import { countdownParts } from "../../lib/time"

export type CountdownView =
    | { state: "none" }
    | { state: "live" }
    | { state: "today"; timeLabel: string }
    | { state: "scheduled"; main: string; seconds: string; dateLabel: string; ariaLabel: string }

const pad = (n: number) => String(n).padStart(2, "0")
const plural = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function countdownView(target: Date | null, now: Date): CountdownView {
    if (!target) return { state: "none" }
    const p = countdownParts(target, now)
    if (!p) return { state: "live" }
    if (sameDay(target, now))
        return { state: "today", timeLabel: target.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/ /g, " ") }
    return {
        state: "scheduled",
        main: `${p.days}d ${pad(p.hours)}h ${pad(p.minutes)}m`,
        seconds: `${pad(p.seconds)}s`,
        dateLabel: target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        ariaLabel: `${plural(p.days, "day")} ${plural(p.hours, "hour")} ${plural(p.minutes, "minute")} until Oscar night`,
    }
}
