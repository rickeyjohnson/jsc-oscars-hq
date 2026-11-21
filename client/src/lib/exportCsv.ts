import { toCsvRow } from "./csv"
import type { VoteRow } from "../types"

const pad = (n: number): string => String(n).padStart(2, "0")

// Local "M/D/YYYY H:mm:ss", the Timestamp format oscars.py's source form used.
export const formatTimestamp = (d: Date): string =>
    `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

type BuildInput = {
    categories: { id: string; name: string }[]
    voters: { user_id: string; name: string }[]
    votes: VoteRow[]
    nomineeNames: Record<string, string>
}

// Header "Timestamp,Name,<categories>"; one row per voter with >=1 vote, ordered by last edit.
export const buildBallotCsv = ({ categories, voters, votes, nomineeNames }: BuildInput): string => {
    const byVoter = new Map<string, VoteRow[]>()
    for (const v of votes) byVoter.set(v.voter_id, [...(byVoter.get(v.voter_id) ?? []), v])

    const rows = voters
        .filter((m) => byVoter.has(m.user_id))
        .map((m) => {
            const mine = byVoter.get(m.user_id)!
            const last = Math.max(...mine.map((v) => new Date(v.updated_at).getTime()))
            const cells = categories.map((c) => {
                const vote = mine.find((v) => v.category_id === c.id)
                return vote ? (nomineeNames[vote.nominee_id] ?? "") : ""
            })
            return { last, line: toCsvRow([formatTimestamp(new Date(last)), m.name, ...cells]) }
        })
        .sort((a, b) => a.last - b.last)

    return [toCsvRow(["Timestamp", "Name", ...categories.map((c) => c.name)]), ...rows.map((r) => r.line)].join("\n") + "\n"
}

export const csvFileName = (ballotName: string): string => {
    // eslint-disable-next-line no-control-regex
    const clean = ballotName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim()
    return `${clean || "ballot"}.csv`
}

// Names that oscars.py (pandas) would read as blank/NaN.
const BLANK_LIKE = /^(na|n\/a|none|null|nan|nil|#n\/a|-nan|<na>)$/i
export const riskyNomineeNames = (names: string[]): string[] =>
    [...new Set(names.map((n) => n.trim()).filter((n) => BLANK_LIKE.test(n)))]
