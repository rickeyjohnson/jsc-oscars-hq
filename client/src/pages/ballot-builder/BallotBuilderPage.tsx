import { useEffect, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { fetchBallotDetail, fetchSeasons, saveBallotDraft, setBallotStatus } from "../../api/ballots"
import { fetchMembers } from "../../api/members"
import type { BallotFormData, Category, Member, Season } from "../../types"
import { Screen } from "../../ui/Screen"
import { Button } from "../../ui/Button"
import { BottomAccessory } from "../../ui/BottomAccessory"
import { GroupedSection } from "../../ui/GroupedSection"
import { ListRow } from "../../ui/ListRow"
import { useToast } from "../../ui/Toast"
import { useConfirm } from "../../ui/ConfirmProvider"
import { detailToForm, isDirty } from "../../lib/draftForm"
import { readBuilderState, toDraftCategories } from "../../lib/myoc"
import { BUILDER_STEPS, stepIssues, type BuilderStep } from "../../ui/logic/builder"
import BallotBasicInfo from "./BallotBasicInfo"
import CategoryList from "./CategoryList"
import CategoryModal from "./CategoryModal"
import BulkImportPanel from "./BulkImportPanel"
import { failureMessage } from "../../lib/failure"
import { OFFLINE_REASON, useOnline } from "../../lib/online"
import { useAuth } from "../../context/AuthContext"
import { clearAutosave, readAutosave, worthRestoring, writeAutosave, type Autosaved } from "../../lib/builderAutosave"

function StepIndicator({ step }: { step: BuilderStep }) {
    const at = BUILDER_STEPS.findIndex((s) => s.id === step)
    return (
        <ol aria-label="Steps" className="mb-6 flex list-none gap-2 p-0">
            {BUILDER_STEPS.map((s, i) => (
                <li key={s.id} aria-current={s.id === step ? "step" : undefined} className="flex-1">
                    <span aria-hidden className={`block h-1 rounded-full ${i <= at ? "bg-label" : "bg-strip-off"}`} />
                    <span className={`mt-1.5 block text-footnote font-bold ${s.id === step ? "text-label" : "text-label-2"}`}>
                        {i + 1}. {s.label}
                    </span>
                </li>
            ))}
        </ol>
    )
}

const BallotBuilderPage = () => {
    const location = useLocation()
    // Accepted MYOC ideas arrive as router state and become draft categories (same name dedupe as bulk import).
    const [seed] = useState(() => toDraftCategories(readBuilderState(location.state)))
    const [formData, setFormData] = useState<BallotFormData>({ season_id: "", name: "", opens_at: "", closes_at: "", categories: seed.categories })
    const [step, setStep] = useState<BuilderStep>("details")
    const [seasons, setSeasons] = useState<Season[]>([])
    const [modalOpen, setModalOpen] = useState(false)
    const [editIndex, setEditIndex] = useState<number | null>(null)
    const [importOpen, setImportOpen] = useState(false)
    const [members, setMembers] = useState<Member[]>([])
    const [ballotId, setBallotId] = useState<string | undefined>()
    const [errors, setErrors] = useState<string[]>([])
    const [busy, setBusy] = useState(false)
    const online = useOnline()
    const navigate = useNavigate()
    const toast = useToast()
    const confirm = useConfirm()
    const [params] = useSearchParams()
    const draftId = params.get("draft")
    const [loadingDraft, setLoadingDraft] = useState(Boolean(draftId))
    // The last saved (or loaded) form: leaving with anything different asks the browser to confirm.
    const [saved, setSaved] = useState<BallotFormData>(formData)
    const dirty = isDirty(formData, saved)

    // Local autosave: unsaved work survives closing the page. One slot per draft ("new" for a ballot that was never saved).
    const { user } = useAuth()
    const userId = user?.id ?? ""
    const slot = draftId ?? "new"
    const [restorable, setRestorable] = useState<Autosaved | null>(null)
    const [checkedRestore, setCheckedRestore] = useState(false)
    useEffect(() => {
        if (loadingDraft || checkedRestore) return
        setCheckedRestore(true)
        if (seed.categories.length > 0) return
        const stored = readAutosave(window.localStorage, userId, slot)
        if (worthRestoring(stored, saved)) setRestorable(stored)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingDraft, userId])
    useEffect(() => {
        if (loadingDraft || !checkedRestore || restorable || !dirty) return
        const t = setTimeout(() => writeAutosave(window.localStorage, userId, slot, formData), 600)
        return () => clearTimeout(t)
    }, [formData, dirty, loadingDraft, checkedRestore, restorable, userId, slot])

    useEffect(() => {
        if (!dirty) return
        const warn = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ""
        }
        window.addEventListener("beforeunload", warn)
        return () => window.removeEventListener("beforeunload", warn)
    }, [dirty])

    // ?draft=<id>: open a saved draft to keep working on it (only drafts can be rewritten).
    useEffect(() => {
        if (!draftId) return
        let live = true
        fetchBallotDetail(draftId)
            .then((d) => {
                if (!live) return
                if (d.status !== "draft") {
                    setErrors(["Only draft ballots can be edited"])
                    return
                }
                const f = detailToForm(d)
                setFormData(f)
                setSaved(f)
                setBallotId(d.id)
            })
            .catch(() => live && setErrors(["Could not load that draft"]))
            .finally(() => live && setLoadingDraft(false))
        return () => {
            live = false
        }
    }, [draftId])

    useEffect(() => {
        if (seed.categories.length > 0) toast.show(`${seed.categories.length} ${seed.categories.length === 1 ? "category" : "categories"} added from Make Your Own Categories`)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchSeasons().then(setSeasons).catch(() => setErrors((p) => [...p, "Could not load seasons"]))
        fetchMembers().then(setMembers).catch(() => setErrors((p) => [...p, "Could not load members"]))
    }, [])

    const handleSave = async (publish: boolean) => {
        if (publish) {
            const problems = stepIssues("review", formData)
            setErrors(problems)
            if (problems.length > 0) return
        } else if (!formData.season_id || !formData.name.trim() || !formData.opens_at || !formData.closes_at) {
            setErrors(["Draft needs a season, name, opening and closing time"])
            return
        } else {
            setErrors([])
        }
        if (publish && !(await confirm({ title: "Publish this ballot?", message: `Members can vote from ${new Date(formData.opens_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} until ${new Date(formData.closes_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`, confirmLabel: "Publish" }))) return
        setBusy(true)
        try {
            const id = await saveBallotDraft(formData, members, ballotId)
            setBallotId(id)
            setSaved(formData)
            clearAutosave(window.localStorage, userId, slot)
            if (publish) {
                await setBallotStatus(id, "open")
                navigate(`/app/profile/ballots/${id}`)
            } else {
                toast.show("Draft saved")
            }
        } catch (e) {
            console.error(e)
            setErrors([failureMessage(publish ? "publish this ballot" : "save this ballot", e) + " Your changes are still here."])
        } finally {
            setBusy(false)
        }
    }

    const setCategories = (categories: Category[]) => setFormData((prev) => ({ ...prev, categories }))
    const handleSaveCategory = (category: Category) => {
        if (editIndex === null) setCategories([...formData.categories, category])
        else setCategories(formData.categories.map((c, i) => (i === editIndex ? category : c)))
    }

    const at = BUILDER_STEPS.findIndex((s) => s.id === step)
    const issues = step === "review" ? [] : stepIssues(step, formData)
    const blockers = stepIssues("review", formData)
    const season = seasons.find((s) => s.id === formData.season_id)
    const fmt = (v: string) => (v ? new Date(v).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not set")

    return (
        <Screen title={draftId ? "Edit draft" : "New ballot"} back={{ to: "/app/profile", label: "You" }}>
            <StepIndicator step={step} />
            {loadingDraft && <p role="status" className="mb-4 text-callout text-label-2">Loading draft…</p>}
            {restorable && (
                <div role="status" className="mb-4 rounded-card bg-surface p-4">
                    <p className="text-callout font-bold">You have unsaved work from {new Date(restorable.savedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="mt-1 text-footnote text-label-2">{restorable.form.name.trim() || "Untitled ballot"} · {restorable.form.categories.length} {restorable.form.categories.length === 1 ? "category" : "categories"}</p>
                    <div className="mt-3 flex gap-2">
                        <Button variant="primary" size="md" onClick={() => { setFormData(restorable.form); setRestorable(null); toast.show("Restored") }}>
                            Restore
                        </Button>
                        <Button variant="secondary" size="md" onClick={() => { clearAutosave(window.localStorage, userId, slot); setRestorable(null) }}>
                            Discard
                        </Button>
                    </div>
                </div>
            )}

            {step === "details" && <BallotBasicInfo formData={formData} setFormData={setFormData} seasons={seasons} />}

            {step === "categories" && (
                <section aria-label="Categories">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-footnote text-label-2">
                            {formData.categories.length} {formData.categories.length === 1 ? "category" : "categories"}. Drag the grip to reorder.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="tinted" size="sm" onClick={() => setImportOpen(true)}>
                                Import
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                icon={<Plus aria-hidden className="size-4" />}
                                onClick={() => {
                                    setEditIndex(null)
                                    setModalOpen(true)
                                }}
                            >
                                Add category
                            </Button>
                        </div>
                    </div>
                    <CategoryList
                        categories={formData.categories}
                        onChange={setCategories}
                        onEdit={(i) => {
                            setEditIndex(i)
                            setModalOpen(true)
                        }}
                    />
                </section>
            )}

            {step === "review" && (
                <div className="space-y-6">
                    <GroupedSection header="Details">
                        <ListRow title="Name" trailing={<span className="text-subhead text-label-2">{formData.name || "Not set"}</span>} />
                        <ListRow title="Season" trailing={<span className="text-subhead text-label-2">{season?.name ?? "Not set"}</span>} />
                        <ListRow title="Opens" trailing={<span className="text-subhead text-label-2">{fmt(formData.opens_at)}</span>} />
                        <ListRow title="Closes" trailing={<span className="text-subhead text-label-2">{fmt(formData.closes_at)}</span>} />
                    </GroupedSection>
                    <GroupedSection header={`${formData.categories.length} categories`}>
                        {formData.categories.map((c, i) => (
                            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                                <span aria-hidden className="w-6 shrink-0 text-footnote tabular-nums text-label-2">
                                    {i + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-body">{c.name}</span>
                                <span className="shrink-0 text-footnote text-label-2">{c.nominee_mode === "everyone" ? "Everyone" : `${c.nominees.length} ${c.nominees.length === 1 ? "option" : "options"}`}</span>
                            </li>
                        ))}
                    </GroupedSection>
                    {blockers.length > 0 && (
                        <section aria-label="Before you can publish" className="rounded-card border-l-4 border-pebble-strawberry bg-surface p-4">
                            <h2 className="mb-2 text-caption-2 uppercase tracking-wider text-label-2">Before you can publish</h2>
                            <ul className="list-disc space-y-1 pl-5 text-subhead">
                                {blockers.map((b) => (
                                    <li key={b}>{b}</li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}

            <BottomAccessory>
                <div className="mx-auto w-full max-w-[720px] space-y-2 px-gutter py-3">
                    {step !== "review" && issues.length > 0 && (
                        <ul aria-label="To continue" className="list-none space-y-0.5 p-0 text-footnote text-label-2">
                            {issues.map((e) => (
                                <li key={e}>{e}</li>
                            ))}
                        </ul>
                    )}
                    {!online && <p className="text-footnote text-label-2">{OFFLINE_REASON}</p>}
                    {errors.length > 0 && (
                        <ul role="alert" className="list-none space-y-0.5 p-0 text-footnote text-danger">
                            {errors.map((e) => (
                                <li key={e}>{e}</li>
                            ))}
                        </ul>
                    )}
                    <div className="flex gap-3">
                        {at > 0 && (
                            <Button variant="tinted" onClick={() => setStep(BUILDER_STEPS[at - 1].id)}>
                                Back
                            </Button>
                        )}
                        {step !== "review" ? (
                            <>
                                <Button variant="secondary" loading={busy} disabled={!online} onClick={() => handleSave(false)}>
                                    Save draft
                                </Button>
                                <Button variant="primary" fullWidth disabled={issues.length > 0} onClick={() => setStep(BUILDER_STEPS[at + 1].id)}>
                                    Next
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" disabled={busy || !online} onClick={() => handleSave(false)}>
                                    Save draft
                                </Button>
                                <Button variant="primary" fullWidth loading={busy} disabled={!online} onClick={() => handleSave(true)}>
                                    Publish
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </BottomAccessory>

            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveCategory}
                initialData={editIndex === null ? undefined : formData.categories[editIndex]}
                existingCategoriesCount={formData.categories.length}
                members={members}
            />
            <BulkImportPanel
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                existingNames={formData.categories.map((c) => c.name)}
                onImport={(cats) => setCategories([...formData.categories, ...cats])}
            />
        </Screen>
    )
}

export default BallotBuilderPage
