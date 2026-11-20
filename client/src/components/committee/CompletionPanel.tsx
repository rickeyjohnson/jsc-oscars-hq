import type { MemberCompletion } from "../../lib/voting"

const CompletionPanel = ({ rows }: { rows: MemberCompletion[] }) => {
    const claimed = rows.filter((r) => r.claimed).length
    const finished = rows.filter((r) => r.claimed && r.total > 0 && r.voted >= r.total).length
    return (
        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4">
            <div className="flex justify-between items-baseline mb-3">
                <h3 className="font-bold">Who has voted</h3>
                <span className="text-sm text-amber-100/60">{finished} of {claimed} finished{claimed < rows.length ? ` (+${rows.length - claimed} not signed up)` : ""}</span>
            </div>
            <div className="space-y-3">
                {rows.map((r) => {
                    const complete = r.total > 0 && r.voted >= r.total
                    const pct = r.total > 0 ? Math.round((r.voted / r.total) * 100) : 0
                    return (
                        <div key={r.name} className={r.claimed ? "" : "opacity-40"}>
                            <div className="flex justify-between text-sm mb-1">
                                <span>{r.name}</span>
                                {r.claimed ? (
                                    <span className={complete ? "text-green-400" : "text-amber-400"}>{r.voted}/{r.total}</span>
                                ) : (
                                    <span className="text-xs">not signed up</span>
                                )}
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-[#fffadd]" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CompletionPanel
