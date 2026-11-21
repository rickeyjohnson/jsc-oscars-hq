// Press-and-hold control. The hold state machine lives in lib/hold.ts; the owner feeds it via these callbacks.
// Lemon fill style: a dark-grey track that fills left to right with lemon while held; not ready is a quieter dark pill, label still readable. The label inverts across the fill using two identical layers
// (light on the track, dark on the fill) with the dark one clipped to the filled part. mix-blend-mode: difference was rejected: it is unreliable on Safari and with transforms.
import { useId } from "react"

const KEY_POINTER_ID = -1 // never collides with real pointer ids

export type HoldButtonProps = {
    ready: boolean
    busy: boolean
    progress: number
    label: string
    hint: string
    busyLabel?: string
    onDown: (pointerId: number, x: number, y: number) => void
    onMove: (pointerId: number, x: number, y: number) => void
    onUp: (pointerId: number) => void
    onCancel: () => void
}

export function HoldButton({ ready, busy, progress, label, hint, busyLabel = "Working…", onDown, onMove, onUp, onCancel }: HoldButtonProps) {
    const hintId = useId()
    const text = busy ? busyLabel : label
    const p = Math.min(1, Math.max(0, progress))
    const layer = "absolute inset-0 flex items-center justify-center text-title-3 pointer-events-none"
    return (
        <div>
            <button
                type="button"
                aria-disabled={!ready || busy}
                aria-describedby={hintId}
                className={`relative block h-14 w-full select-none overflow-hidden rounded-full border-2 ${!ready ? "border-surface-2 bg-surface cursor-not-allowed" : "border-surface-2 bg-surface-2 cursor-pointer"}`}
                style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return
                    e.currentTarget.setPointerCapture?.(e.pointerId)
                    onDown(e.pointerId, e.clientX, e.clientY)
                }}
                onPointerMove={(e) => onMove(e.pointerId, e.clientX, e.clientY)}
                onPointerUp={(e) => onUp(e.pointerId)}
                onPointerCancel={onCancel}
                onPointerLeave={onCancel}
                onKeyDown={(e) => {
                    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                        e.preventDefault()
                        onDown(KEY_POINTER_ID, 0, 0)
                    }
                }}
                onKeyUp={(e) => {
                    if (e.key === " " || e.key === "Enter") onUp(KEY_POINTER_ID)
                }}
                onBlur={onCancel}
            >
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left bg-pebble-lemon" style={{ transform: `scaleX(${p})` }} />
                <span className={`${layer} text-label`}>{text}</span>
                <span aria-hidden className={`${layer} text-on-pebble-lemon`} style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
                    {text}
                </span>
            </button>
            <p id={hintId} className="mt-2 text-center text-subhead text-label-2">
                {hint}
            </p>
        </div>
    )
}
