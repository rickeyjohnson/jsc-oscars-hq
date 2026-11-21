import { useState } from "react"
import { Button } from "../../ui/Button"
import { SheetActions } from "../../ui/SheetActions"
import { Sheet, type SheetProps } from "../../ui/Sheet"
import { ConfirmProvider, useConfirm } from "../../ui/ConfirmProvider"

const LINES = Array.from({ length: 24 }, (_, i) => `Row ${i + 1}`)

function Rows() {
    return (
        <ul className="space-y-2">
            {LINES.map((l) => (
                <li key={l} className="rounded-control bg-fill px-4 py-3 text-body">
                    {l}
                </li>
            ))}
        </ul>
    )
}

type Variant = { id: string; label: string; props: Partial<SheetProps>; body?: "rows" | "input" }

const VARIANTS: Variant[] = [
    { id: "medium", label: "Medium sheet", props: { detents: ["medium", "large"], initialDetent: "medium" }, body: "rows" },
    { id: "large", label: "Large sheet", props: { detents: ["large"] }, body: "rows" },
    { id: "dirty", label: "Dirty close", props: { detents: ["large"], dirty: true }, body: "input" },
    { id: "keyboard", label: "Keyboard-open input", props: { detents: ["large"], footer: null }, body: "input" },
    { id: "wide", label: "Wide dialog (desktop 720px)", props: { detents: ["large"], width: "wide" }, body: "rows" },
]

function SheetDemo({ v }: { v: Variant }) {
    const [open, setOpen] = useState(false)
    const close = () => setOpen(false)
    return (
        <>
            <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
                {v.label}
            </Button>
            <Sheet
                open={open}
                onClose={close}
                title={v.label}
                footer={
                    <SheetActions>
                        <Button fullWidth size="md" onClick={close}>
                            Save
                        </Button>
                    </SheetActions>
                }
                {...v.props}
            >
                {v.body === "input" ? (
                    <label className="block space-y-2">
                        <span className="text-footnote text-label-2">Display name</span>
                        <input className="h-12 w-full rounded-control bg-fill px-4 text-body" placeholder="Type here" />
                    </label>
                ) : (
                    <Rows />
                )}
            </Sheet>
        </>
    )
}

function ConfirmDemo() {
    const confirm = useConfirm()
    const [last, setLast] = useState("none yet")
    const ask = async (o: Parameters<typeof confirm>[0]) => setLast((await confirm(o)) ? "confirmed" : "cancelled")
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="md" onClick={() => ask({ title: "Create a committee round?", message: "It opens for voting right away.", confirmLabel: "Create round" })}>
                    Confirm
                </Button>
                <Button variant="secondary" size="md" onClick={() => ask({ title: "Close voting for Oscars 2026?", message: "Votes can no longer be changed.", confirmLabel: "Close voting", destructive: true })}>
                    Destructive confirm
                </Button>
            </div>
            <p className="text-footnote text-label-2" aria-live="polite">
                Last answer: {last}
            </p>
        </div>
    )
}

export default function Sheets() {
    return (
        <ConfirmProvider>
            <div className="space-y-6">
                <p className="text-callout text-label-2">Bottom sheets below 1024px (drag the grabber); centered dialogs from 1024px. Esc closes, Tab stays inside.</p>
                <div className="flex flex-wrap gap-3">
                    {VARIANTS.map((v) => (
                        <SheetDemo key={v.id} v={v} />
                    ))}
                </div>
                <ConfirmDemo />
            </div>
        </ConfirmProvider>
    )
}
