import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { FOCUSABLE, nextFocus } from "./logic/focusTrap"

export const DESKTOP_QUERY = "(min-width: 1024px)"

export function useIsDesktop(): boolean {
    const read = () => (typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP_QUERY).matches : false)
    const [on, setOn] = useState(read)
    useEffect(() => {
        if (typeof window.matchMedia !== "function") return
        const mq = window.matchMedia(DESKTOP_QUERY)
        const handler = () => setOn(mq.matches)
        handler()
        mq.addEventListener("change", handler)
        return () => mq.removeEventListener("change", handler)
    }, [])
    return on
}

// Shared across every open dialog: scroll lock is counted so nested dialogs restore it exactly once,
// and only the top-most dialog reacts to Escape.
const stack: symbol[] = []
let locks = 0
let savedOverflow = ""

function lockScroll() {
    if (locks++ === 0) {
        savedOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"
    }
}
function unlockScroll() {
    if (--locks === 0) document.body.style.overflow = savedOverflow
}

// While `open`: locks body scroll, routes Escape to the top-most dialog, and returns focus to the opener on close.
export function useDialogLifecycle(open: boolean, onEscape: () => void) {
    const esc = useRef(onEscape)
    useEffect(() => {
        esc.current = onEscape
    })
    useLayoutEffect(() => {
        if (!open) return
        const opener = document.activeElement as HTMLElement | null
        const id = Symbol("dialog")
        stack.push(id)
        lockScroll()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && stack[stack.length - 1] === id) {
                e.preventDefault()
                esc.current()
            }
        }
        document.addEventListener("keydown", onKey)
        return () => {
            document.removeEventListener("keydown", onKey)
            stack.splice(stack.indexOf(id), 1)
            unlockScroll()
            // After React's own post-commit focus restore, which would otherwise win.
            queueMicrotask(() => {
                if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus()
            })
        }
    }, [open])
}

const visible = (el: HTMLElement) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"

export function focusables(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible)
}

// Tab / Shift+Tab stay inside `root`.
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault(): void }, root: HTMLElement | null) {
    if (e.key !== "Tab" || !root) return
    const target = nextFocus(focusables(root), document.activeElement, e.shiftKey) ?? root
    e.preventDefault()
    target.focus()
}

// Moves focus into the dialog once it mounts: `[data-autofocus]`, else the first non-chrome control, else the panel.
export function useInitialFocus(ref: RefObject<HTMLElement | null>, prefer: "first" | "title" = "first") {
    useEffect(() => {
        const root = ref.current
        if (!root) return
        const marked = root.querySelector<HTMLElement>("[data-autofocus]")
        const first = focusables(root).find((el) => !el.closest("[data-chrome]"))
        const title = root.querySelector<HTMLElement>("[data-title]")
        const target = marked ?? (prefer === "title" ? title : first) ?? title ?? root
        target.focus({ preventScroll: true })
    }, [ref, prefer])
}

// Keeps the footer above the on-screen keyboard (phone only).
export function useKeyboardInset(active: boolean): number {
    const [inset, setInset] = useState(0)
    useEffect(() => {
        const vv = window.visualViewport
        if (!active || !vv) return
        const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
        update()
        vv.addEventListener("resize", update)
        vv.addEventListener("scroll", update)
        return () => {
            vv.removeEventListener("resize", update)
            vv.removeEventListener("scroll", update)
            setInset(0)
        }
    }, [active])
    return inset
}
