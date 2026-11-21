import { useId } from "react"
import { TextField } from "../../ui/TextField"
import { DESC_MAX, HINTS, NAME_MAX, type IdeaDraft, type IdeaErrors, type MyocHint } from "../../lib/myoc"

const CHIP = "min-h-11 cursor-pointer select-none rounded-full px-4 text-subhead font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

/** Optional "who gets nominated" hint. Tap the chosen one again to clear it. */
export function HintPicker({ value, onChange }: { value: MyocHint | null; onChange: (h: MyocHint | null) => void }) {
    const id = useId()
    return (
        <div>
            <p id={id} className="mb-1.5 text-subhead font-bold text-label-2">
                Who would be nominated? (optional)
            </p>
            <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
                {HINTS.map((h) => {
                    const on = value === h.value
                    return (
                        <button key={h.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? null : h.value)} className={`${CHIP} ${on ? "bg-inverse text-on-inverse" : "bg-fill text-label"}`}>
                            {h.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/** Name, description and hint: the same three fields in the suggest form, the member edit sheet and the committee sheet. */
export function IdeaFields({ value, onChange, errors = {} }: { value: IdeaDraft; onChange: (v: IdeaDraft) => void; errors?: IdeaErrors }) {
    const descId = useId()
    return (
        <div className="space-y-4">
            <div>
                <TextField label="Category name" value={value.name} maxLength={NAME_MAX} placeholder="Most likely to miss the flight" aria-invalid={errors.name ? true : undefined} onChange={(e) => onChange({ ...value, name: e.target.value })} />
                {errors.name && (
                    <p role="alert" className="mt-1.5 text-footnote text-danger">
                        {errors.name}
                    </p>
                )}
            </div>
            <div>
                <label htmlFor={descId} className="mb-1.5 block text-subhead font-bold text-label-2">
                    What is it for? (optional)
                </label>
                <textarea
                    id={descId}
                    rows={3}
                    value={value.description}
                    aria-invalid={errors.description ? true : undefined}
                    onChange={(e) => onChange({ ...value, description: e.target.value })}
                    className="w-full resize-none rounded-control bg-surface-2 px-4 py-3 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent"
                />
                <div className="mt-1.5 flex justify-between gap-3 text-footnote">
                    <span role={errors.description ? "alert" : undefined} className="text-danger">
                        {errors.description}
                    </span>
                    <span className={`tabular-nums ${value.description.length > DESC_MAX ? "text-danger" : "text-label-2"}`}>
                        {value.description.length}/{DESC_MAX}
                    </span>
                </div>
            </div>
            <HintPicker value={value.hint} onChange={(hint) => onChange({ ...value, hint })} />
        </div>
    )
}
