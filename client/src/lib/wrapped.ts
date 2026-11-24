import { ordinal } from "./resultsView"
import { expectedWins, fmtRate, groupRate, metricValues, placement, totals, type StatsModel } from "./statsLab"

export type WrappedSlide = { key: string; kicker: string; big: string; line: string }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** The recap of one past season for one member, from the per-season tallies. Slides are skipped when there is nothing honest to say. */
export function wrappedSlides(m: StatsModel, memberId: string, k: number): WrappedSlide[] {
    const sem = m.sems[k]
    if (!sem) return []
    const t = totals(m, memberId, k)
    const label = sem.label
    if (t.noms === 0) {
        return [{ key: "out", kicker: `${label} Wrapped`, big: "Sat this one out", line: "You had no nominations this season." }]
    }
    const approx = sem.approx ? "At least " : ""
    const slides: WrappedSlide[] = [
        { key: "intro", kicker: "Wrapped", big: label, line: "Your season in a few taps." },
        { key: "noms", kicker: "Nominated", big: `${approx}${t.noms}`, line: `${approx}${plural(t.noms, "time", "times")} your name came up.` },
        { key: "wins", kicker: "Won", big: String(t.wins), line: t.wins === 0 ? "No trophies this time." : `${plural(t.wins, "trophy", "trophies")} for the shelf.` },
    ]
    const g = groupRate(m, k)
    if (t.rate !== null && g !== null) {
        const mine = t.rate
        const group = g * 100
        slides.push({ key: "rate", kicker: "Win rate", big: fmtRate(mine, 0), line: `The group's was ${fmtRate(group, 0)}. ${mine > group + 0.5 ? "You beat it." : mine < group - 0.5 ? "A little under." : "Right on it."}` })
    }
    const place = placement(metricValues(m, "wins", { k }), memberId)
    if (place && place.n > 1) slides.push({ key: "rank", kicker: "Standings", big: `${place.tied ? "T-" : ""}${ordinal(place.rank)}`, line: `by wins, out of ${place.n} members.` })
    const exp = expectedWins(m, memberId).perSem[k]
    if (exp && !sem.approx) {
        const d = exp.diff
        slides.push({ key: "expected", kicker: "Expected vs actual", big: `${d >= 0 ? "+" : ""}${d.toFixed(1)}`, line: `You were expected to win ${exp.expected.toFixed(1)} and won ${exp.actual}. ${d >= 0.5 ? "Over performing." : d <= -0.5 ? "Under performing." : "On par."}` })
    }
    let wins = 0
    let noms = 0
    for (let i = 0; i <= k; i++) {
        const c = m.cells[memberId]?.[i]
        if (c) {
            wins += c.wins
            noms += c.noms
        }
    }
    if (k > 0) slides.push({ key: "career", kicker: "Career so far", big: String(wins), line: `${plural(wins, "win", "wins")} from ${noms} nominations through ${label}.` })
    return slides
}
