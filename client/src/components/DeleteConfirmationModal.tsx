import { ConfirmSheet } from "../ui/ConfirmSheet"

interface DeleteConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    description?: string
    confirmText?: string
}

// Compat adapter: same props, now rendered by the shared ConfirmSheet.
const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Delete Item",
    description = "Are you sure you want to delete this? This action cannot be undone.",
    confirmText = "Delete",
}: DeleteConfirmModalProps) => (
    <ConfirmSheet
        open={isOpen}
        title={title}
        message={description}
        confirmLabel={confirmText}
        destructive
        onCancel={onClose}
        onConfirm={() => {
            onConfirm()
            onClose()
        }}
    />
)

export default DeleteConfirmationModal
