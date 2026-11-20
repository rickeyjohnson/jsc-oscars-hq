import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import NavigationBar from "../../components/NavigationBar"
import NavigationTabs from "../../components/NavigationTabs"
import { countVotesBy, fetchMembers, resetMemberClaim } from "../../api/members"
import { useUserData } from "../../context/UserContenxt"
import { memberRows, memberSummary, resetWarning, type MemberRow } from "../../lib/memberNames"
import type { Member } from "../../types"

type Confirm = { row: MemberRow; votes: number | null; error: string | null }

const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

const MemberNamesPage = () => {
    const { member } = useUserData()
    const [members, setMembers] = useState<Member[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [confirm, setConfirm] = useState<Confirm | null>(null)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const cancelRef = useRef<HTMLButtonElement>(null)
    const myUserId = member?.user_id ?? null

    const load = useCallback(async () => {
        setLoadError(null)
        try {
            setMembers(await fetchMembers())
            return true
        } catch (e) {
            setLoadError(msg(e, "Could not load members"))
            return false
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    useEffect(() => {
        if (confirm) cancelRef.current?.focus()
    }, [confirm?.row.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const open = async (row: MemberRow) => {
        if (busy || !myUserId || !row.userId || row.userId === myUserId) return
        setNotice(null)
        setConfirm({ row, votes: null, error: null })
        try {
            const votes = await countVotesBy(row.userId as string)
            setConfirm((c) => (c && c.row.id === row.id ? { ...c, votes } : c))
        } catch (e) {
            setConfirm((c) => (c && c.row.id === row.id ? { ...c, error: msg(e, "Could not count votes") } : c))
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
            setConfirm((c) => (c ? { ...c, error: msg(e, "Reset failed") } : c))
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
        <div className="bg-zinc-900 min-h-screen text-[#fffadd] pb-24">
            <NavigationBar />
            <main className="px-6 py-6 max-w-md mx-auto">
                <Link to="/app/profile" className="text-sm text-amber-100/60">← Back to profile</Link>
                <h1 className="text-lg font-semibold mt-3">Member names</h1>
                {members && <div className="text-xs text-amber-100/60">{memberSummary(members)}</div>}
                {!members && !loadError && <div className="text-amber-100/60 mt-4">Loading...</div>}
                {loadError && (
                    <div role="alert" className="mt-4 space-y-3">
                        <div className="text-red-400">{loadError}</div>
                        <button onClick={() => void load()} className="bg-amber-100 text-zinc-900 font-bold rounded-full h-10 px-5">Retry</button>
                    </div>
                )}
                {notice && <div role="status" className="mt-3 text-sm text-green-300">{notice}</div>}
                <ul className="mt-2">
                    {rows.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 bg-[#3f3f46] rounded-[10px] px-[10px] py-2 mt-1.5">
                            <span className={`flex-1 ${r.userId ? "" : "opacity-50"}`}>{r.name}</span>
                            <span className="text-[10px] rounded-full px-2 py-0.5 bg-[#3f3f46] border border-amber-100/20 whitespace-nowrap">{r.status}</span>
                            {r.userId && r.isYou && <span className="text-[11px] text-amber-100/60">You</span>}
                            {r.userId && !r.isYou && myUserId && (
                                <button
                                    onClick={() => void open(r)}
                                    disabled={busy}
                                    aria-label={`Reset ${r.name}`}
                                    className="bg-[#302f2d] text-[#fffadd] rounded-full px-3 py-[7px] text-[11px] disabled:opacity-50"
                                >
                                    Reset
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
                {members && <p className="text-[11px] text-amber-100/60 mt-3">You can't reset your own name; ask another committee member.</p>}
                {confirm && (
                    <div role="group" aria-label={`Reset ${confirm.row.name}`} className="bg-[#27272a] rounded-[14px] p-3 mt-3 border border-[#7f1d1d]">
                        <b>Reset {confirm.row.name}?</b>
                        <div className="text-xs text-amber-100/60 mt-1 mb-2" aria-live="polite">
                            {confirm.votes === null && !confirm.error ? "Counting votes..." : confirm.votes !== null ? resetWarning(confirm.row.name, confirm.votes) : ""}
                        </div>
                        {confirm.error && <div role="alert" className="text-red-400 text-xs mb-2">{confirm.error}</div>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => void doReset()}
                                disabled={busy || confirm.votes === null}
                                className="bg-[#7f1d1d] text-[#fecaca] rounded-full px-3 py-[7px] text-[11px] disabled:opacity-50"
                            >
                                {busy ? "Resetting…" : "Reset claim"}
                            </button>
                            <button ref={cancelRef} onClick={() => setConfirm(null)} disabled={busy} className="bg-[#302f2d] text-[#fffadd] rounded-full px-3 py-[7px] text-[11px] disabled:opacity-50">Cancel</button>
                        </div>
                    </div>
                )}
            </main>
            <NavigationTabs activeTab={"profile"} />
        </div>
    )
}

export default MemberNamesPage
