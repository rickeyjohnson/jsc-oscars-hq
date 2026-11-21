import { useId, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react"
import { ConfirmSheet } from "./ConfirmSheet"
import { fade, spring } from "./motion"
import { dragOutcome, type Detent } from "./logic/sheetDrag"
import { trapTab, useDialogLifecycle, useInitialFocus, useIsDesktop, useKeyboardInset } from "./useDialog"

export type { Detent }

export type SheetProps = {
    open: boolean
    onClose: () => void
    title: string
    detents?: Detent[]
    initialDetent?: Detent
    leading?: ReactNode
    trailing?: ReactNode
    footer?: ReactNode
    dirty?: boolean
    initialFocus?: "first" | "title"
    /** Desktop dialog width: 560px by default, 720px for builder sheets. */
    width?: "default" | "wide"
    /** Size to the content (up to 92% of the screen) instead of a fixed detent height. Content scrolls inside when taller. */
    fit?: boolean
    /** Keep the title for assistive tech only (the content shows its own heading). */
    hideTitle?: boolean
    children: ReactNode
}

const HEIGHT: Record<Detent, string> = { medium: "h-[55dvh]", large: "h-[92dvh]" }

type FrameProps = Omit<SheetProps, "open" | "dirty" | "onClose"> & { requestClose: () => void }

function Frame({ requestClose, title, detents = ["large"], initialDetent, leading, trailing, footer, initialFocus, width = "default", fit, hideTitle, children }: FrameProps) {
    const desktop = useIsDesktop()
    const reduce = useReducedMotion()
    const kb = useKeyboardInset(!desktop)
    const panel = useRef<HTMLDivElement>(null)
    const body = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const controls = useDragControls()
    const [detent, setDetent] = useState<Detent>(initialDetent ?? detents[0])
    const [dragging, setDragging] = useState(false)
    useInitialFocus(panel, initialFocus)

    const onDragEnd = (_: unknown, info: PanInfo) => {
        setDragging(false)
        const out = dragOutcome({ offsetY: info.offset.y, velocityY: info.velocity.y, height: panel.current?.offsetHeight ?? 600, detent, detents })
        if (out === "dismiss") requestClose()
        else setDetent(out)
    }
    const startDrag = (e: React.PointerEvent) => {
        if (!desktop) controls.start(e)
    }
    const motionProps = reduce
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: fade }
        : desktop
          ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 }, transition: spring.snappy }
          : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: spring.sheet }
    const cycle = () => {
        if (detents.length < 2) return
        setDetent((d) => (d === "medium" ? "large" : "medium"))
    }

    return (
        <div className="fixed inset-0 z-[60]">
            <motion.div
                className="sheet-backdrop absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                onClick={requestClose}
                aria-hidden
            />
            <div
                className={`pointer-events-none absolute inset-x-0 top-0 flex ${desktop ? "items-center justify-center p-6" : "items-end"}`}
                style={{ bottom: desktop ? 0 : kb }}
            >
                <motion.div
                    ref={panel}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    tabIndex={-1}
                    data-dragging={dragging || undefined}
                    onKeyDown={(e) => trapTab(e, panel.current)}
                    className={`material-sheet pointer-events-auto relative flex w-full flex-col overflow-hidden outline-none ${
                        desktop
                            ? `max-h-[85dvh] rounded-sheet ${width === "wide" ? "max-w-[720px]" : "max-w-[560px]"}`
                            : `${fit ? "max-h-[92dvh]" : `${HEIGHT[detent]} max-h-full`} rounded-t-[30px] transition-[height] duration-200 motion-reduce:transition-none`
                    }`}
                    {...motionProps}
                    {...(desktop
                        ? {}
                        : {
                              drag: "y" as const,
                              dragListener: false,
                              dragControls: controls,
                              dragConstraints: { top: 0, bottom: 0 },
                              dragElastic: { top: 0.05, bottom: 0.6 },
                              dragSnapToOrigin: true,
                              onDragStart: () => setDragging(true),
                              onDragEnd,
                          })}
                >
                    {!desktop && (
                        <div data-chrome className="flex shrink-0 justify-center pt-2" style={{ touchAction: "none" }} onPointerDown={startDrag}>
                            <button type="button" aria-label="Resize sheet" onClick={cycle} className="flex h-6 w-16 items-center justify-center rounded-full">
                                <span aria-hidden className="h-1.5 w-10 rounded-full bg-label-3" />
                            </button>
                        </div>
                    )}
                    <header className="flex shrink-0 items-center gap-3 px-6 pb-4 pt-3" style={{ touchAction: desktop ? undefined : "none" }} onPointerDown={startDrag}>
                        {leading && <div data-chrome className="shrink-0">{leading}</div>}
                        <h2 id={titleId} data-title tabIndex={-1} className={hideTitle ? "sr-only" : "text-title-3 min-w-0 flex-1 truncate outline-none"}>
                            {title}
                        </h2>
                        {trailing && <div data-chrome className="shrink-0">{trailing}</div>}
                        {desktop && (
                            <button
                                type="button"
                                data-chrome
                                aria-label="Close"
                                onClick={requestClose}
                                className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-label"
                            >
                                <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M2 2l10 10M12 2L2 12" />
                                </svg>
                            </button>
                        )}
                    </header>
                    <BodyScroll bodyRef={body} onPointerDown={(e) => !desktop && body.current?.scrollTop === 0 && controls.start(e)}>
                        {children}
                    </BodyScroll>
                    {footer && <footer className="shrink-0 border-t border-sep px-6 pt-4 [padding-bottom:max(env(safe-area-inset-bottom),20px)] [&_.flex]:gap-3">{footer}</footer>}
                </motion.div>
            </div>
        </div>
    )
}

function BodyScroll({ bodyRef, onPointerDown, children }: { bodyRef: React.RefObject<HTMLDivElement | null>; onPointerDown: (e: React.PointerEvent) => void; children: ReactNode }) {
    return (
        <div ref={bodyRef} onPointerDown={onPointerDown} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
            {children}
        </div>
    )
}

export function Sheet({ open, onClose, dirty, ...rest }: SheetProps) {
    const [discarding, setDiscarding] = useState(false)
    const requestClose = () => (dirty ? setDiscarding(true) : onClose())
    useDialogLifecycle(open, requestClose)
    return createPortal(
        <>
            <AnimatePresence>{open && <Frame key="sheet" requestClose={requestClose} {...rest} />}</AnimatePresence>
            <ConfirmSheet
                open={open && discarding}
                title="Discard changes?"
                confirmLabel="Discard"
                destructive
                onCancel={() => setDiscarding(false)}
                onConfirm={() => {
                    setDiscarding(false)
                    onClose()
                }}
            />
        </>,
        document.body,
    )
}
