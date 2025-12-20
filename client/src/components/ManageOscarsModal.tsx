import { Calendar, Clock, Plus } from "lucide-react"
import Modal, { ModalBody, ModalFooter, ModalHeader } from "./Modal"
import StatusBadge from "./StatusBadge"
import { useState } from "react"
import EditOscarEvent from "./EditOscarEvent"
import DeleteConfirmationModal from "./DeleteConfirmationModal"

const ManageOscarsModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    const [showEditEventModal, setShowEditEventModal] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [isEdit, setIsEdit] = useState(false)

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                title="Oscar Events"
                description="Add, edit, or delete Oscar events and ceremonies"
            />

            <button
                onClick={() => {
                    setShowEditEventModal(true)
                    setIsEdit(false)
                }}
                className="w-full mb-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-amber-700 transition flex items-center justify-center gap-2 text-sm"
            >
                <Plus className="w-5 h-5" />
                Add New Event
            </button>

            <ModalBody>
                <div className="space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-3">
                    {[].length === 0 ? (
                        <div className="bg-zinc-800/50 rounded-xl p-8 text-center">
                            <Calendar className="w-12 h-12 text-amber-100/40 mx-auto mb-3" />
                            <p className="text-amber-100/60">
                                No events added yet
                            </p>
                            <p className="text-xs text-amber-100/40 mt-1">
                                Click "Add New Event" to create your first event
                            </p>
                        </div>
                    ) : (
                        [1, 2, 3, 4, 5, 6, 7, 8].map((_event, index) => (
                            <div
                                key={index}
                                className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="font-bold text-amber-100 text-md mb-1">
                                            NAME
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-amber-100/60">
                                            <div className="flex items-center justify-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date().toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        weekday: "long",
                                                        year: "numeric",
                                                        month: "long",
                                                        day: "numeric",
                                                    }
                                                )}
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                TIME
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <StatusBadge status={"upcoming"} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowEditEventModal(true)
                                            setIsEdit(true)
                                        }}
                                        className="flex-1 py-2 bg-amber-100/10 text-amber-100 rounded-xl text-sm font-medium hover:bg-amber-100/20 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() =>
                                            setShowDeleteConfirmation(true)
                                        }
                                        className="flex-1 py-2 bg-red-500/10 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition border border-red-500/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ModalBody>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-amber-100/10 text-amber-100 text-sm rounded-xl font-medium hover:bg-amber-100/20 transition"
                >
                    Close
                </button>
            </ModalFooter>

            <EditOscarEvent
                isOpen={showEditEventModal}
                onClose={() => setShowEditEventModal(false)}
                isEdit={isEdit}
            />

            <DeleteConfirmationModal
                isOpen={showDeleteConfirmation}
                onClose={() => setShowDeleteConfirmation(false)}
                onConfirm={() => {}}
            />
        </Modal>
    )
}

export default ManageOscarsModal
