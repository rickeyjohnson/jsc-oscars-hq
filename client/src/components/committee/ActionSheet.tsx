import { useId, type ReactNode } from "react"
import { Sheet } from "../../ui/Sheet"
import { SheetActions } from "../../ui/SheetActions"
import { Button } from "../../ui/Button"

// One confirm sheet for committee actions: the body says who is affected, the footer has the one confirm button
// (the loud fill lives here, never on the page). Closing is the header X.
export function ActionSheet({
    open,
    onClose,
    title,
    confirmLabel,
    danger,
    onConfirm,
    busy,
    error,
    disabled,
    children,
}: {
    open: boolean
    onClose: () => void
    title: string
    confirmLabel: string
    danger?: boolean
    onConfirm: () => void
    busy?: boolean
    error?: string | null
    disabled?: boolean
    children: ReactNode
}) {
    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={title}
            fit
            footer={
                <SheetActions>
                    <Button variant={danger ? "destructive" : "primary"} size="md" fullWidth onClick={onConfirm} loading={busy} disabled={disabled}>
                        {confirmLabel}
                    </Button>
                </SheetActions>
            }
        >
            <div className="space-y-3">
                {children}
                {error && <p role="alert" className="text-callout text-danger">{error}</p>}
            </div>
        </Sheet>
    )
}

export const fieldCls = "block w-full min-h-11 rounded-control bg-surface-2 px-3 text-body text-label focus-visible:outline-2 focus-visible:outline-accent"

// A labelled datetime-local field.
export function CloseTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const id = useId()
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-subhead font-bold text-label-2">{label}</label>
            <input id={id} type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={fieldCls} />
        </div>
    )
}
