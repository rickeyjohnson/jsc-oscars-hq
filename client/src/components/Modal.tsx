import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Sheet } from "../ui/Sheet"

// Compat adapter: same exports and props, now rendered by the shared Sheet.
const TitleContext = createContext<(t: string) => void>(() => {})

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    maxWidth?: string // e.g. "max-w-lg", "max-w-xl"
}

interface ModalHeaderProps {
    title: string
    width?: string
    description?: string
    onClose?: () => void
    rightSlot?: ReactNode
}

interface ModalBodyProps {
    children: ReactNode
}

interface ModalFooterProps {
    children: ReactNode
}

export const ModalHeader = ({
    title,
    description,
    width = "w-[60%]",
}: ModalHeaderProps) => {
    const setTitle = useContext(TitleContext)
    useEffect(() => setTitle(title), [title, setTitle])
    return (
        <div className={`${width}`}>
            <h2 className="text-lg font-semibold text-amber-100 mb-1">
                {title}
            </h2>
            <p className="text-xs text-amber-100/60 mb-6">{description}</p>
        </div>
    )
}

export const ModalBody = ({ children }: ModalBodyProps) => {
    return (
        <div className="text-amber-100/90 space-y-4 max-h-[40vh] overflow-y-auto mb-6">
            {children}
        </div>
    )
}

export const ModalFooter = ({ children }: ModalFooterProps) => {
    return <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
}

const WIDE = /max-w-(xl|2xl|3xl|4xl|5xl|6xl|7xl)$/

const Modal = ({
    isOpen,
    onClose,
    children,
    maxWidth = "max-w-lg",
}: ModalProps) => {
    const [title, setTitle] = useState("Dialog")
    return (
        <Sheet open={isOpen} onClose={onClose} title={title} detents={["large"]} width={WIDE.test(maxWidth) ? "wide" : "default"} hideTitle>
            <TitleContext.Provider value={setTitle}>{children}</TitleContext.Provider>
        </Sheet>
    )
}

export default Modal
