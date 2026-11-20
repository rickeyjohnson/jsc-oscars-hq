import { useState } from "react"
import { fetchBallotDetail } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import { fetchAllVotes } from "../../api/votes"
import { buildBallotCsv, csvFileName } from "../../lib/exportCsv"

type Props = { ballotId: string; ballotName: string }

// Builds the oscars.py-compatible CSV in the browser and downloads it as <ballot name>.csv.
const ExportCsvButton = ({ ballotId, ballotName }: Props) => {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const exportCsv = async () => {
        setBusy(true)
        setError(null)
        try {
            const [detail, members, votes] = await Promise.all([fetchBallotDetail(ballotId), fetchMembers(), fetchAllVotes(ballotId)])
            const nomineeNames: Record<string, string> = {}
            for (const c of detail.categories) for (const n of c.nominees) nomineeNames[n.id] = n.display_name
            const voters = members.filter((m) => m.user_id).map((m) => ({ user_id: m.user_id as string, name: m.name }))
            const csv = buildBallotCsv({ categories: detail.categories.map((c) => ({ id: c.id, name: c.name })), voters, votes, nomineeNames })

            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
            const a = document.createElement("a")
            a.href = url
            a.download = csvFileName(ballotName)
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not export CSV")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button onClick={exportCsv} disabled={busy} className="bg-[#302f2d] text-[#fffadd] rounded-full text-xs px-3 py-1.5 disabled:opacity-50">
                {busy ? "Exporting..." : "⬇ Export CSV"}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
    )
}

export default ExportCsvButton
