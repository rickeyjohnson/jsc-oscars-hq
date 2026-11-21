import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "../../ui/Button"
import { fetchBallotDetail } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import { fetchAllVotes } from "../../api/votes"
import { buildBallotCsv, csvFileName, riskyNomineeNames } from "../../lib/exportCsv"

const EXPORT_FAILED = "Couldn't export the CSV. Check your connection and try again."

type Props = { ballotId: string; ballotName: string }

// Builds the oscars.py-compatible CSV in the browser and downloads it as <ballot name>.csv.
const ExportCsvButton = ({ ballotId, ballotName }: Props) => {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [risky, setRisky] = useState<string[]>([])

    const exportCsv = async () => {
        setBusy(true)
        setError(null)
        try {
            const [detail, members, votes] = await Promise.all([fetchBallotDetail(ballotId), fetchMembers(), fetchAllVotes(ballotId)])
            const nomineeNames: Record<string, string> = {}
            for (const c of detail.categories) for (const n of c.nominees) nomineeNames[n.id] = n.display_name
            setRisky(riskyNomineeNames(Object.values(nomineeNames)))
            const voters = members.filter((m) => m.user_id).map((m) => ({ user_id: m.user_id as string, name: m.name }))
            const csv = buildBallotCsv({ categories: detail.categories.map((c) => ({ id: c.id, name: c.name })), voters, votes, nomineeNames })

            const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
            const a = document.createElement("a")
            a.href = url
            a.download = csvFileName(ballotName)
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch (e) {
            console.error(e)
            setError(EXPORT_FAILED)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button variant="secondary" size="sm" onClick={exportCsv} loading={busy} loadingLabel="Exporting…" icon={<Download aria-hidden className="size-4" />}>
                Export CSV
            </Button>
            {risky.length > 0 && <span className="text-footnote font-bold">Heads up: nominee "{risky[0]}" will be read as blank by oscars.py.</span>}
            {error && <span role="alert" className="text-footnote font-bold">{error}</span>}
        </div>
    )
}

export default ExportCsvButton
