import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Sheet } from "../ui/Sheet"

// Thin wrapper over the shared Sheet: same header (title left, Close top-right), padding, scrolling and footer.
const TitleContext = createContext<(t: string) => void>(() => {})

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    /** Sticky action footer (use SheetActions). */
    footer?: ReactNode
    maxWidth?: string // e.g. "max-w-lg", "max-w-xl"
}

/** Sets the sheet title; the optional description sits under it in the body. */
export const ModalHeader = ({ title, description }: { title: string; description?: string; width?: string; onClose?: () => void; rightSlot?: ReactNode }) => {
    const setTitle = useContext(TitleContext)
    useEffect(() => setTitle(title), [title, setTitle])
    return description ? <p className="mb-4 text-subhead text-label-2">{description}</p> : null
}

export const ModalBody = ({ children }: { children: ReactNode }) => <div className="space-y-4">{children}</div>

const WIDE = /max-w-(xl|2xl|3xl|4xl|5xl|6xl|7xl)$/

const Modal = ({ isOpen, onClose, children, footer, maxWidth = "max-w-lg" }: ModalProps) => {
    const [title, setTitle] = useState("Dialog")
    return (
        <Sheet open={isOpen} onClose={onClose} title={title} detents={["large"]} width={WIDE.test(maxWidth) ? "wide" : "default"} footer={footer}>
            <TitleContext.Provider value={setTitle}>{children}</TitleContext.Provider>
        </Sheet>
    )
}

export default Modal
