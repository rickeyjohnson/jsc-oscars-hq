import Modal, { ModalHeader } from "./Modal"

const EditOscarEvent = ({
    isOpen,
    onClose,
    isEdit,
}: {
    isOpen: boolean
    onClose: () => void
    isEdit: boolean
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
        >
            <ModalHeader title={isEdit ? "Edit Event" : "Add New Event"} description={isEdit
                    ? "Update event details"
                    : "Create a new Oscar event"}/>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Event Name
                    </label>
                    <input
                        type="text"
                        className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                        placeholder="97th Academy Awards"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Date
                    </label>
                    <input
                        type="date"
                        className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 [color-scheme:dark]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Time
                    </label>
                    <input
                        type="time"
                        className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 [color-scheme:dark]"
                    />
                </div>
            </div>

            <div className="flex gap-3 mt-6 text-sm">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-amber-100/10 text-amber-100 rounded-xl font-medium hover:bg-amber-100/20 transition"
                >
                    Cancel
                </button>
                <button
                    className="flex-1 py-3 bg-amber-100 text-zinc-900 rounded-xl font-bold hover:bg-amber-200 transition"
                >
                    {isEdit ? "Update Event" : "Create Event"}
                </button>
            </div>
        </Modal>
    )
}

export default EditOscarEvent
