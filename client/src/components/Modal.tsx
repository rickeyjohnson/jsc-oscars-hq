import type { ReactNode } from "react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    maxWidth?: string // e.g. "max-w-lg", "max-w-xl"
}

const Modal = ({
    isOpen,
    onClose,
    children,
    maxWidth = "max-w-lg",
}: ModalProps) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className={`relative w-full ${maxWidth} mx-4 bg-zinc-900 border border-amber-100/10 rounded-2xl shadow-xl p-6`}
            >
                {children}
            </div>
        </div>
    )
}

export default Modal
