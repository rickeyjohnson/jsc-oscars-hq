import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Inbox, Plus } from "lucide-react"
import { fetchBallotSummaries, fetchCurrentSeason } from "../../api/ballots"
import { fetchReleaseStatus } from "../../api/results"
import { releaseChecks } from "../../lib/release"
import { groupBallots, phaseOf, type GroupKey, type ManageItem } from "../../lib/ballotFlow"
import type { BallotSummary } from "../../lib/voting"
import { Screen } from "../../ui/Screen"
import { Button } from "../../ui/Button"
import { StatusPill } from "../../ui/StatusPill"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { COPY } from "../../ui/copy"
import { PEBBLE_EDGE } from "../../ui/logic/pebble"
import { SegmentedControl } from "../../ui/SegmentedControl"
import { useAuth } from "../../context/AuthContext"
import { hasWork, readAutosave } from "../../lib/builderAutosave"

type Tab = "active" | "drafts" | "closed"
const TAB_OF: Record<GroupKey, Tab> = { needs: "active", open: "active", scheduled: "active", drafts: "drafts", finished: "closed" }

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

const subtitle = (b: BallotSummary, now: Date): string => {
    const p = phaseOf(b, now)
    const cats = plural(b.category_count, "category", "categories")
    if (p === "scheduled") return `Opens ${day(b.opens_at)} · ${cats}`
    if (p === "draft") return cats
    if (p === "open") return `Closes ${day(b.closes_at)} · ${cats}`
    return `${p === "released" ? "Revealed" : "Closed"} ${day(b.closes_at)} · ${cats}`
}

const Row = ({ b, hint, child, now }: { b: BallotSummary; hint?: string | null; child?: boolean; now: Date }) => {
    const p = phaseOf(b, now)
    return (
        <li>
            <Link to={p === "draft" ? `/app/profile/ballots/create?draft=${b.id}` : `/app/profile/ballots/${b.id}`} className={`flex min-h-16 w-full items-center gap-3 py-3 pr-4 hover:bg-fill active:bg-fill ${child ? "bg-fill pl-8" : "pl-4"}`}>
                <span className="min-w-0 flex-1">
                    <span className={`block truncate font-bold ${child ? "text-callout" : "text-body"}`}>{b.name}</span>
                    <span className="block truncate text-footnote text-label-2">{subtitle(b, now)}</span>
                    {hint && <span className="block text-footnote font-bold text-pebble-lemon">Next: {hint}</span>}
                </span>
                <StatusPill phase={p} />
            </Link>
        </li>
    )
}

type Reveal = { released: boolean; passed: number; total: number } | null

const ManageBallotsPage = () => {
    const [ballots, setBallots] = useState<BallotSummary[] | null>(null)
    const [error, setError] = useState(false)
    const [reload, setReload] = useState(0)
    const [reveal, setReveal] = useState<Reveal>(null)
    const [params, setParams] = useSearchParams()
    const tabParam = params.get("tab")
    const tab: Tab = tabParam === "drafts" || tabParam === "closed" ? tabParam : "active"
    const setTab = (t: Tab) => setParams(t === "active" ? {} : { tab: t }, { replace: true })
    const { user } = useAuth()
    // A ballot that was started in the builder but never saved as a draft (kept on this device).
    const unsaved = (() => {
        try {
            const a = readAutosave(window.localStorage, user?.id ?? "", "new")
            return a && hasWork(a.form) ? a : null
        } catch {
            return null
        }
    })()

    useEffect(() => {
        let cancelled = false
        fetchBallotSummaries(true)
            .then((b) => !cancelled && setBallots(b))
            .catch((e) => {
                console.error(e)
                if (!cancelled) setError(true)
            })
        return () => {
            cancelled = true
        }
    }, [reload])

    // The season's reveal card is a nicety: if its data cannot be read the list still works.
    useEffect(() => {
        let cancelled = false
        void (async () => {
            try {
                const season = await fetchCurrentSeason()
                if (!season) return
                const status = await fetchReleaseStatus(season.id)
                const { checks } = releaseChecks(status, new Date())
                if (!cancelled) setReveal({ released: status.season.results_released_at != null, passed: checks.filter((c) => c.ok).length, total: checks.length })
            } catch {
                /* hidden */
            }
        })()
        return () => {
            cancelled = true
        }
    }, [reload])

    const now = new Date()
    const groups = ballots ? groupBallots(ballots, now) : []
    const visible = groups.filter((g) => TAB_OF[g.key] === tab)
    const count = (t: Tab) => groups.filter((g) => TAB_OF[g.key] === t).reduce((n, g) => n + g.items.length, 0)
    const item = (it: ManageItem) => (
        <div key={it.ballot.id}>
            <Row b={it.ballot} hint={it.hint} now={now} />
            {it.children.map((c) => <Row key={c.id} b={c} child now={now} />)}
        </div>
    )
    return (
        <Screen title="Manage ballots" back={{ to: "/app/profile", label: "You" }} width="wide">
            <div className="mb-5">
                <Button to="/app/profile/ballots/create" variant="primary" size="md" icon={<Plus aria-hidden className="size-4" />}>
                    New ballot
                </Button>
            </div>
            {error && (
                <ErrorState
                    title={COPY.somethingWrong}
                    body={COPY.loadFailed("ballots")}
                    onRetry={() => {
                        setError(false)
                        setBallots(null)
                        setReload((k) => k + 1)
                    }}
                />
            )}
            {!error && ballots === null && (
                <SkeletonScreen label="Loading ballots">
                    <div className="space-y-2">
                        <Skeleton shape="row" />
                        <Skeleton shape="row" />
                        <Skeleton shape="row" />
                    </div>
                </SkeletonScreen>
            )}
            {!error && ballots?.length === 0 && <EmptyState icon={Inbox} title="No ballots yet" />}
            {!error && ballots && (ballots.length > 0 || unsaved) && (
                <div className="mb-4 max-w-md">
                    <SegmentedControl<Tab>
                        label="Ballot lists"
                        idPrefix="manage-tab"
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: "active", label: `Active (${count("active")})`, muted: count("active") === 0 },
                            { value: "drafts", label: `Drafts (${count("drafts") + (unsaved ? 1 : 0)})`, muted: count("drafts") + (unsaved ? 1 : 0) === 0 },
                            { value: "closed", label: `Closed (${count("closed")})`, muted: count("closed") === 0 },
                        ]}
                    />
                </div>
            )}
            {!error && ballots && (ballots.length > 0 || unsaved) && (
                <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2 lg:items-start">
                    <div className="space-y-5">
                        {tab === "drafts" && unsaved && (
                            <section aria-label="Unsaved work">
                                <h2 className="mb-1.5 px-1 text-caption-2 font-bold uppercase tracking-wider text-label-2">Not saved yet</h2>
                                <ul className="list-none overflow-hidden rounded-card bg-surface p-0">
                                    <li>
                                        <Link to="/app/profile/ballots/create" className="flex min-h-16 w-full items-center gap-3 py-3 pl-4 pr-4 hover:bg-fill active:bg-fill">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-body font-bold">{unsaved.form.name.trim() || "Untitled ballot"}</span>
                                                <span className="block truncate text-footnote text-label-2">Resume unsaved work · {plural(unsaved.form.categories.length, "category", "categories")}</span>
                                            </span>
                                        </Link>
                                    </li>
                                </ul>
                            </section>
                        )}
                        {visible.map((g) => (
                            <section key={g.key} aria-label={g.title}>
                                {visible.length > 1 && <h2 className="mb-1.5 px-1 text-caption-2 font-bold uppercase tracking-wider text-label-2">{g.title}</h2>}
                                <ul className="list-none divide-y divide-sep overflow-hidden rounded-card bg-surface p-0">{g.items.map(item)}</ul>
                            </section>
                        ))}
                        {visible.length === 0 && !(tab === "drafts" && unsaved) && (
                            <EmptyState icon={Inbox} title={tab === "drafts" ? "No drafts" : tab === "closed" ? "No closed ballots" : "Nothing active"} />
                        )}
                    </div>
                    {tab === "active" && reveal && (
                        <section aria-label="Reveal winners" className={`rounded-card border-l-4 bg-surface p-4 ${PEBBLE_EDGE.lemon}`}>
                            <p className="text-caption-2 font-bold tracking-wider text-label-2">REVEAL WINNERS</p>
                            <h2 className="mt-1 text-headline">{reveal.released ? "Winners are live" : reveal.passed === reveal.total ? "Ready to reveal" : `Not ready: ${reveal.passed} of ${reveal.total} checks`}</h2>
                            <p className="mt-1 text-callout text-label-2">
                                {reveal.released ? "Members can see every winner." : "Members see no winners until you reveal. Needs: every ballot closed, no round open, a winner in every category."}
                            </p>
                            {!reveal.released && <Button to="/app/profile/release" variant="secondary" size="md" className="mt-3">Check reveal</Button>}
                        </section>
                    )}
                </div>
            )}
        </Screen>
    )
}

export default ManageBallotsPage
