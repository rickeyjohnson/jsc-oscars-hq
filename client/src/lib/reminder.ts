// Ready-to-paste group-chat nudge for members who have not finished a ballot.
const firstName = (full: string): string => full.trim().split(/\s+/)[0] ?? ""

// "Sat, Nov 28, 8:00 PM ET", always New York time so the chat sees one clock.
export const closingLabelNY = (closesAt: Date): string => {
    const s = closesAt.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    return `${s.replace(" at ", ", ")} ET`
}

export const joinNames = (names: string[]): string => {
    if (names.length <= 1) return names[0] ?? ""
    if (names.length === 2) return `${names[0]} and ${names[1]}`
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
}

export type ReminderInput = { missing: string[]; ballotName: string; closesAt: Date; siteUrl: string }

export function reminderMessage({ missing, ballotName, closesAt, siteUrl }: ReminderInput): string {
    if (missing.length === 0) return `Everyone has voted on ${ballotName}. Thanks, all!`
    const firsts = missing.map(firstName).filter(Boolean)
    return `${joinNames(firsts)}, you haven't voted yet on ${ballotName}. Voting closes ${closingLabelNY(closesAt)}. Vote here: ${siteUrl}`
}
