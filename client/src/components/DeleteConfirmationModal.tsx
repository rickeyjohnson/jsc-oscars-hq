import { AnimatePresence, motion } from "motion/react"

interface DeleteConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    description?: string
    confirmText?: string
}

// TODO: make this look prettier (like profile setup)

const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Item",
    description = "Are you sure you want to delete this? This action cannot be undone.",
    confirmText = "Delete",
}: DeleteConfirmModalProps) => {
    if (!isOpen) return null

    return (
        <>
            <AnimatePresence>
                <motion.div
                    key="deletition-confirmation-container"
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{
                        y: "-110%",
                        opacity: 0,
                        scale: 0.96,
                        filter: "blur(6px)",
                        transition: {
                            duration: 1.25,
                            ease: [0.22, 1, 0.36, 1],
                        },
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen"
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative flex flex-col justify-items items-center w-[80%]">
                        <h2 className="font-bold">{title}</h2>
                        <p className="text-[#fffadd]/60 mt-2">{description}</p>

                        <button
                            onClick={onClose}
                            className="px-4 py-2 w-full rounded-xl bg-amber-100/10 text-amber-100 hover:bg-amber-100/20 transition"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => {
                                onConfirm()
                                onClose()
                            }}
                            className="px-4 py-2 w-full rounded-xl bg-red-500 text-zinc-900 font-bold hover:bg-red-600 transition"
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </>
    )
}

export default DeleteConfirmationModal
