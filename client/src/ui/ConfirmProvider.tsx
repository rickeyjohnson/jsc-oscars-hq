import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { ConfirmSheet } from "./ConfirmSheet"

export type ConfirmOptions = { title: string; message?: string; confirmLabel: string; destructive?: boolean }
type Confirm = (o: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

export function useConfirm(): Confirm {
    const c = useContext(ConfirmContext)
    if (!c) throw new Error("useConfirm must be used inside <ConfirmProvider>")
    return c
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [opts, setOpts] = useState<ConfirmOptions | null>(null)
    const [open, setOpen] = useState(false)
    const resolver = useRef<((v: boolean) => void) | null>(null)

    const confirm = useCallback<Confirm>((o) => {
        resolver.current?.(false) // a newer question cancels the pending one
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve
            setOpts(o)
            setOpen(true)
        })
    }, [])
    const settle = useCallback((v: boolean) => {
        resolver.current?.(v)
        resolver.current = null
        setOpen(false) // keep opts so the exit animation still shows the text
    }, [])
    const api = useMemo(() => confirm, [confirm])

    return (
        <ConfirmContext.Provider value={api}>
            {children}
            {opts && <ConfirmSheet open={open} {...opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} />}
        </ConfirmContext.Provider>
    )
}
