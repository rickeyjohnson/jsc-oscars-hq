import { useCallback, useEffect, useRef, useState } from "react"
import { Users } from "lucide-react"
import { countVotesBy, fetchMembers, resetMemberClaim } from "../../api/members"
import { useUserData } from "../../context/UserContenxt"
import { memberRows, memberSummary, resetWarning, type MemberRow } from "../../lib/memberNames"
import type { Member } from "../../types"
import { Screen } from "../../ui/Screen"
import { Avatar } from "../../ui/Avatar"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { ColorBlock } from "../../ui/ColorBlock"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { GroupedSection } from "../../ui/GroupedSection"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { COPY } from "../../ui/copy"

type Confirm = { row: MemberRow; votes: number | null; error: string | null }

// Raw error text never reaches the screen; it goes to the console.
// Exception: the stale-claim message from resetMemberClaim is written for the committee member.
const STALE_CLAIM = "This name was changed by someone else"
const msg = (e: unknown, fallback: string) => {
    console.error(e)
    return e instanceof Error && e.message.startsWith(STALE_CLAIM) ? e.message : fallback
}

const MemberNamesPage = () => {
    const { member } = useUserData()
    const [members, setMembers] = useState<Member[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [confirm, setConfirm] = useState<Confirm | null>(null)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const confirmRef = useRef<HTMLDivElement>(null)
    const myUserId = member?.user_id ?? null

    const load = useCallback(async () => {
        setLoadError(null)
        try {
            setMembers(await fetchMembers())
            return true
        } catch (e) {
            setLoadError(msg(e, COPY.loadFailed("members")))
            return false
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        if (confirm) confirmRef.current?.querySelector<HTMLButtonElement>("[data-cancel]")?.focus()
    }, [confirm?.row.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const open = async (row: MemberRow) => {
        if (busy || !myUserId || !row.userId || row.userId === myUserId) return
        setNotice(null)
        setConfirm({ row, votes: null, error: null })
        try {
            const votes = await countVotesBy(row.userId as string)
            setConfirm((c) => (c && c.row.id === row.id ? { ...c, votes } : c))
        } catch (e) {
            setConfirm((c) => (c && c.row.id === row.id ? { ...c, error: msg(e, "Couldn't count their votes. Check your connection and try again.") } : c))
        }
    }

    const doReset = async () => {
        if (busy || !confirm) return
        const { row } = confirm
        if (!myUserId || !row.userId || row.userId === myUserId) return
        setBusy(true)
        try {
            await resetMemberClaim(row.name, row.userId)
        } catch (e) {
            setConfirm((c) => (c ? { ...c, error: msg(e, "Couldn't reset that name. Check your connection and try again.") } : c))
            setBusy(false)
            return
        }
        try {
            setConfirm(null)
            setNotice(`${row.name} can sign up again. Delete their login in Supabase → Authentication → Users.`)
            if (!(await load())) setNotice(`Reset done, but the list couldn't refresh. ${row.name} can sign up again; delete their login in Supabase → Authentication → Users.`)
        } finally {
            setBusy(false)
        }
    }

    const rows = members ? memberRows(members, myUserId) : []

    return (
        <Screen title="Member names" back={{ to: "/app/profile", label: "You" }} subtitle={members ? memberSummary(members) : undefined} width="wide">
            <div className="max-w-[720px] space-y-4">
                {!members && !loadError && (
                    <SkeletonScreen label="Loading members">
                        <div className="space-y-2">
                            <Skeleton shape="row" />
                            <Skeleton shape="row" />
                            <Skeleton shape="row" />
                        </div>
                    </SkeletonScreen>
                )}
                {loadError && <ErrorState title={COPY.somethingWrong} body={loadError} onRetry={() => void load()} />}
                {notice && <div role="status" className="rounded-card bg-surface p-4 text-callout text-success">{notice}</div>}
                {members && rows.length === 0 && <EmptyState icon={Users} title="No member names yet" />}
                {rows.length > 0 && (
                    <GroupedSection footer="You can't reset your own name; ask another committee member.">
                        {rows.map((r) => (
                            <li key={r.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                                <Avatar id={r.name} name={r.name} size={32} ring="pebble" decorative />
                                <span className={`min-w-0 flex-1 truncate text-body ${r.userId ? "" : "text-label-2"}`}>{r.name}</span>
                                <Chip tone={r.userId ? "lime" : "neutral"}>{r.status}</Chip>
                                {r.userId && r.isYou && <Chip tone="lemon">You</Chip>}
                                {r.userId && !r.isYou && myUserId && (
                                    <Button variant="secondary" size="sm" onClick={() => void open(r)} disabled={busy} aria-label={`Reset ${r.name}`}>
                                        Reset
                                    </Button>
                                )}
                            </li>
                        ))}
                    </GroupedSection>
                )}
                {confirm && (
                    <div ref={confirmRef} role="group" aria-label={`Reset ${confirm.row.name}`}>
                        <ColorBlock pebble="cherry">
                            <b className="text-headline">Reset {confirm.row.name}?</b>
                            <div className="mb-3 mt-1 text-footnote font-bold" aria-live="polite">
                                {confirm.votes === null && !confirm.error ? "Counting votes..." : confirm.votes !== null ? resetWarning(confirm.row.name, confirm.votes) : ""}
                            </div>
                            {confirm.error && <div role="alert" className="mb-3 text-footnote font-bold">{confirm.error}</div>}
                            <div className="flex gap-2">
                                <Button variant="primary" size="md" onClick={() => void doReset()} disabled={busy || confirm.votes === null}>
                                    {busy ? "Resetting…" : "Reset claim"}
                                </Button>
                                <Button variant="secondary" size="md" data-cancel onClick={() => setConfirm(null)} disabled={busy}>
                                    Cancel
                                </Button>
                            </div>
                        </ColorBlock>
                    </div>
                )}
            </div>
        </Screen>
    )
}

export default MemberNamesPage
