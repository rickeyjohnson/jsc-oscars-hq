import { PATCH_NOTES } from "../lib/patchNotes"
import { Screen } from "../ui/Screen"

export default function PatchNotesPage() {
    return (
        <Screen title="Patch notes" back={{ to: "/app/profile/settings", label: "Settings" }}>
            <div className="mx-auto max-w-xl space-y-4">
                {PATCH_NOTES.map((n, i) => (
                    <section key={n.version} aria-labelledby={`pn-${n.version}`} className="rounded-card bg-surface p-4">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2 id={`pn-${n.version}`} className="text-title-3">
                                {n.title}
                            </h2>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-footnote font-bold ${i === 0 ? "bg-inverse text-on-inverse" : "bg-fill text-label-2"}`}>v{n.version}</span>
                        </div>
                        <p className="mt-0.5 text-footnote text-label-2">{n.date}</p>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-callout">
                            {n.changes.map((c) => (
                                <li key={c}>{c}</li>
                            ))}
                        </ul>
                    </section>
                ))}
            </div>
        </Screen>
    )
}
