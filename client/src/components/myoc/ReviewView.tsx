import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Inbox, Lightbulb } from "lucide-react"
import { fetchReviewIdeas } from "../../api/myoc"
import {
    acceptedIdeas, FILTERS, filterCounts, filterIdeas, hintLabel, myocErrorKind, MYOC_LOAD_FAILED, MYOC_UNAVAILABLE, sortForBuilder, toBuilderIdeas,
    type BuilderState, type MyocWindow, type ReviewFilter, type ReviewIdea, type WindowPhase,
} from "../../lib/myoc"
import { BottomAccessory } from "../../ui/BottomAccessory"
import { Button } from "../../ui/Button"
import { Chip } from "../../ui/Chip"
import { EmptyState } from "../../ui/EmptyState"
import { ErrorState } from "../../ui/ErrorState"
import { MemberAvatar } from "../../ui/MemberAvatar"
import { Skeleton, SkeletonScreen } from "../../ui/Skeleton"
import { useToast } from "../../ui/Toast"
import { COPY } from "../../ui/copy"
import type { ChipTone } from "../../ui/logic/variants"
import { ReviewSheet } from "./ReviewSheet"

type Load = { status: "loading" } | { status: "error"; unavailable: boolean } | { status: "ready"; ideas: ReviewIdea[] }

const STATUS_LABEL = { submitted: "New", accepted: "Accepted", rejected: "Rejected", merged: "Merged", withdrawn: "Withdrawn" } as const
const STATUS_TONE: Record<ReviewIdea["status"], ChipTone> = { submitted: "sky", accepted: "lime", rejected: "neutral", merged: "neutral", withdrawn: "neutral" }

/** The committee inbox: every idea with its submitter, filters, one sheet per idea, and the hand-off to the ballot builder. */
export function ReviewView({ window: w, phase }: { window: MyocWindow | null; phase: WindowPhase }) {
    const navigate = useNavigate()
    const toast = useToast()
    const [load, setLoad] = useState<Load>({ status: "loading" })
    const [reload, setReload] = useState(0)
    const [filter, setFilter] = useState<ReviewFilter>("new")
    const [openId, setOpenId] = useState<string | null>(null)
    const windowId = w?.id ?? null

    useEffect(() => {
        if (!windowId) return
        let live = true
        fetchReviewIdeas(windowId)
            .then((ideas) => live && setLoad({ status: "ready", ideas }))
            .catch((e) => {
                console.error(e)
                if (live) setLoad({ status: "error", unavailable: myocErrorKind(e) === "unavailable" })
            })
        return () => {
            live = false
        }
    }, [windowId, reload])

    if (!w || phase === "none") return <EmptyState icon={Inbox} title="No window yet" body="Open one from the Window tab and ideas will land here." />
    if (load.status === "error") {
        if (load.unavailable) return <EmptyState icon={Lightbulb} title={MYOC_UNAVAILABLE} body="The database update for it hasn't been applied." />
        return (
            <ErrorState
                title={COPY.somethingWrong}
                body={MYOC_LOAD_FAILED}
                onRetry={() => {
                    setLoad({ status: "loading" })
                    setReload((k) => k + 1)
                }}
            />
        )
    }
    if (load.status === "loading") {
        return (
            <SkeletonScreen label="Loading ideas">
                <div className="space-y-2">
                    <Skeleton shape="row" />
                    <Skeleton shape="row" />
                    <Skeleton shape="row" />
                </div>
            </SkeletonScreen>
        )
    }

    const ideas = load.ideas
    const counts = filterCounts(ideas)
    const shown = filterIdeas(ideas, filter)
    const accepted = acceptedIdeas(ideas)
    const open = ideas.find((i) => i.id === openId) ?? null

    const build = () => {
        const state: BuilderState = { myocIdeas: toBuilderIdeas(sortForBuilder(accepted)) }
        navigate("/app/profile/ballots/create", { state })
    }

    return (
        <div className="pb-24">
            <div role="group" aria-label="Filter ideas" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
                {FILTERS.map((f) => {
                    const on = f.value === filter
                    return (
                        <button
                            key={f.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setFilter(f.value)}
                            className={`min-h-11 shrink-0 cursor-pointer select-none rounded-full px-4 text-subhead font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${on ? "bg-inverse text-on-inverse" : "bg-fill text-label"}`}
                        >
                            {f.label} <span className="tabular-nums">{counts[f.value]}</span>
                        </button>
                    )
                })}
            </div>

            {shown.length === 0 ? (
                <EmptyState icon={Inbox} title={ideas.length === 0 ? "No ideas yet" : "Nothing here"} body={ideas.length === 0 ? "Ideas members send in show up here with who sent them." : "Try another filter."} />
            ) : (
                <ul className="grid list-none grid-cols-1 items-stretch gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
                    {shown.map((i) => (
                        <li key={i.id} className="flex">
                            <button
                                type="button"
                                onClick={() => setOpenId(i.id)}
                                aria-label={`Review ${i.name}, from ${i.author.name}`}
                                className="relative flex h-32 w-full cursor-pointer items-start gap-3 overflow-hidden rounded-card bg-surface p-4 text-left hover:bg-fill active:bg-fill"
                            >
                                <MemberAvatar memberId={i.author.id ?? undefined} name={i.author.name} size={40} ring="pebble" decorative />
                                <span className="flex h-full min-w-0 flex-1 flex-col">
                                    <span className="line-clamp-2 break-words pr-20 text-body font-bold">{i.name}</span>
                                    <span className="mt-auto truncate text-footnote text-label-2">
                                        {[i.author.name, hintLabel(i.hint)].filter(Boolean).join(" · ")}
                                    </span>
                                </span>
                                <span className="absolute right-4 top-4">
                                    <Chip tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Chip>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <BottomAccessory>
                <div className="mx-auto w-full max-w-[720px] bg-bg px-gutter py-3">
                    <Button variant="primary" size="md" fullWidth disabled={accepted.length === 0} onClick={build}>
                        {accepted.length === 0 ? "Accept ideas to build a ballot" : `Build ballot from ${accepted.length} accepted`}
                    </Button>
                </div>
            </BottomAccessory>

            <ReviewSheet
                idea={open}
                all={ideas}
                onClose={() => setOpenId(null)}
                onSaved={(message) => {
                    setOpenId(null)
                    toast.show(message)
                    setReload((k) => k + 1)
                }}
            />
        </div>
    )
}
