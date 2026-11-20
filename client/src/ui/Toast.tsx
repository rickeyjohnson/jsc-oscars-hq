import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { fade } from "./motion"
import { TOAST_MS, toastReducer, type ToastItem } from "./logic/toast"

type ShowOpts = { actionLabel?: string; onAction?: () => void; persistent?: boolean }
type ToastApi = { show(text: string, o?: ShowOpts): void }

// Optional context: outside a provider, show() is a no-op so shared components stay usable in isolation.
const NOOP: ToastApi = { show: () => {} }
const ToastContext = createContext<ToastApi>(NOOP)

export const useToast = (): ToastApi => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, dispatch] = useReducer(toastReducer, [] as ToastItem[])
    const nextId = useRef(1)
    const actions = useRef(new Map<number, () => void>())
    const show = useCallback((text: string, o?: ShowOpts) => {
        const id = nextId.current++
        actions.current.clear()
        if (o?.onAction) actions.current.set(id, o.onAction)
        dispatch({ type: "show", item: { id, text, actionLabel: o?.actionLabel, persistent: o?.persistent } })
    }, [])
    const api = useMemo(() => ({ show }), [show])
    const toast = items[0]

    useEffect(() => {
        if (!toast || toast.persistent) return
        const t = setTimeout(() => dispatch({ type: "dismiss", id: toast.id }), TOAST_MS)
        return () => clearTimeout(t)
    }, [toast])

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-gutter pb-safe">
                <div role="status" aria-live="polite" className="mb-24 w-full max-w-md">
                    <AnimatePresence>
                        {toast && (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={fade}
                                className="pointer-events-auto material-sheet flex items-center gap-3 rounded-full py-2 pl-5 pr-2 text-subhead"
                            >
                                <span className="flex-1 min-w-0">{toast.text}</span>
                                {toast.actionLabel && (
                                    <button
                                        type="button"
                                        className="min-h-11 rounded-full px-4 text-subhead font-bold text-accent cursor-pointer"
                                        onClick={() => {
                                            actions.current.get(toast.id)?.()
                                            dispatch({ type: "dismiss", id: toast.id })
                                        }}
                                    >
                                        {toast.actionLabel}
                                    </button>
                                )}
                                {toast.persistent && (
                                    <button type="button" className="min-h-11 rounded-full px-4 text-subhead text-label-2 cursor-pointer" onClick={() => dispatch({ type: "dismiss", id: toast.id })}>
                                        Dismiss
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </ToastContext.Provider>
    )
}
