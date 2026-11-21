// Pure checklist for the Submit ballot screen. Submitting is a confirmation only: votes stay editable until close.
export type SubmitRow = { id: "voted" | "private" | "editable"; ok: boolean; label: string }
export type SubmitBlock = "closed" | "upcoming" | "empty" | null
export type SubmitChecklist = { items: SubmitRow[]; submittable: boolean; blocked: SubmitBlock }

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export const closesLabel = (d: Date): string => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function submitChecklist(i: { voted: number; total: number; closesAt: Date; now: Date; opensAt?: Date; status?: string }): SubmitChecklist {
    const skipped = Math.max(0, i.total - i.voted)
    const closed = i.status === "closed" || i.status === "released" || i.closesAt.getTime() <= i.now.getTime()
    const upcoming = !closed && i.opensAt !== undefined && i.opensAt.getTime() > i.now.getTime()
    const blocked: SubmitBlock = closed ? "closed" : upcoming ? "upcoming" : i.voted <= 0 ? "empty" : null
    const items: SubmitRow[] = [
        skipped === 0
            ? { id: "voted", ok: true, label: `${i.voted} of ${i.total} categories voted` }
            : { id: "voted", ok: false, label: `${skipped} ${plural(skipped, "category", "categories")} skipped` },
        { id: "private", ok: true, label: "Your picks are private" },
        { id: "editable", ok: true, label: `You can still edit until ${closesLabel(i.closesAt)}` },
    ]
    return { items, submittable: blocked === null, blocked }
}
