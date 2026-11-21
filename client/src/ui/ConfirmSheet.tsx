import { useId, useRef } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Button } from "./Button"
import { SheetActions } from "./SheetActions"
import { fade, spring } from "./motion"
import { trapTab, useDialogLifecycle, useInitialFocus, useIsDesktop } from "./useDialog"

export type ConfirmSheetProps = {
    open: boolean
    title: string
    message?: string
    confirmLabel: string
    /** Label for the dismiss button (default "Cancel"). */
    cancelLabel?: string
    destructive?: boolean
    onConfirm(): void
    onCancel(): void
}

function Panel({ title, message, confirmLabel, cancelLabel = "Cancel", destructive, onConfirm, onCancel }: Omit<ConfirmSheetProps, "open">) {
    const desktop = useIsDesktop()
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const descId = useId()
    useInitialFocus(ref)
    const motionProps = reduce
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: fade }
        : desktop
          ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 }, transition: spring.snappy }
          : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: spring.sheet }
    return (
        <div className="fixed inset-0 z-[70]">
            <motion.div
                className="sheet-backdrop absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                onClick={onCancel}
                aria-hidden
            />
            <div className={`pointer-events-none absolute inset-0 flex ${desktop ? "items-center justify-center p-6" : "items-end"}`}>
                <motion.div
                    ref={ref}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={message ? descId : undefined}
                    tabIndex={-1}
                    onKeyDown={(e) => trapTab(e, ref.current)}
                    className={`material-sheet pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-y-auto outline-none ${desktop ? "max-w-[400px] rounded-sheet" : "rounded-t-[30px]"}`}
                    {...motionProps}
                >
                    <div className="px-6 pt-7">
                        <h2 id={titleId} className="text-title-3">
                            {title}
                        </h2>
                        {message && (
                            <p id={descId} className="text-callout text-label-2 mt-3">
                                {message}
                            </p>
                        )}
                    </div>
                    <div className="px-6 pt-6 [padding-bottom:max(env(safe-area-inset-bottom),24px)]">
                        <SheetActions>
                            <Button variant={destructive ? "destructive" : "primary"} size="md" fullWidth onClick={onConfirm}>
                                {confirmLabel}
                            </Button>
                            <Button variant="tinted" size="md" fullWidth onClick={onCancel} data-autofocus>
                                {cancelLabel}
                            </Button>
                        </SheetActions>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export function ConfirmSheet({ open, ...rest }: ConfirmSheetProps) {
    useDialogLifecycle(open, rest.onCancel)
    return createPortal(<AnimatePresence>{open && <Panel key="confirm" {...rest} />}</AnimatePresence>, document.body)
}
