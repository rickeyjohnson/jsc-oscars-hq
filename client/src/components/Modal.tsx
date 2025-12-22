import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"

interface ModalProps {
    isOpen?: boolean
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
    return <div className="flex items-center justify-end gap-3">{children}</div>
}

const Modal = ({
    isOpen,
    onClose,
    children,
    maxWidth = "max-w-lg",
}: ModalProps) => {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                />
                <motion.div
                    className={`relative w-full ${maxWidth} mx-4 bg-zinc-900 border border-amber-100/10 shadow-xl p-8 rounded-3xl max-h-[80vh]`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                >
                    {children}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default Modal
