import { Calendar, Clock, Plus } from "lucide-react"
import Modal, { ModalHeader } from "./Modal"
import { Button } from "../ui/Button"
import StatusBadge from "./StatusBadge"
import { useEffect, useState } from "react"
import EditOscarEvent from "./EditOscarEvent"
import DeleteConfirmationModal from "./DeleteConfirmationModal"
import { useUserData, type OscarsEvent } from "../context/UserContenxt"
import { supabase } from "../supabaseClient"
import FullScreenLoader from "./FullScreenLoader"

const ManageOscarsModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    const { fetchOscars } = useUserData()
    const [showEditEventModal, setShowEditEventModal] = useState(false)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [isEdit, setIsEdit] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<OscarsEvent>({})
    const [oscarsEvents, setOscarsEvents] = useState<OscarsEvent[]>([])
    const [loading, setLoading] = useState(true)

    const handleDelete = async () => {
        setLoading(true)
        const { error } = await supabase
            .from("oscarsEvents")
            .delete()
            .eq("id", selectedEvent.id ?? "")
            .select()

        setLoading(false)

        if (error) {
            console.error("error deleting oscar event record: ", error.message)
        }
    }

    useEffect(() => {
        fetchOscars().then((data) => setOscarsEvents(data))

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false)
    }, [fetchOscars, showEditEventModal, showDeleteConfirmation])

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Oscar Events" description="Add, edit, or delete Oscar events and ceremonies" />

            <Button
                fullWidth
                icon={<Plus aria-hidden className="size-5" />}
                onClick={() => {
                    setShowEditEventModal(true)
                    setIsEdit(false)
                }}
            >
                Add New Event
            </Button>

            <div className="mt-4 space-y-3">
                {oscarsEvents.length === 0 ? (
                    <div className="rounded-card bg-surface-2 p-8 text-center">
                        <Calendar aria-hidden className="mx-auto mb-3 size-12 text-label-3" />
                        <p className="text-callout text-label-2">No events added yet</p>
                        <p className="mt-1 text-footnote text-label-3">Click "Add New Event" to create your first event</p>
                    </div>
                ) : (
                    oscarsEvents.map((event) => (
                        <div key={event.id} className="rounded-card bg-surface-2 p-4">
                            <p className="mb-1 text-headline">{event.name}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-subhead text-label-2">
                                <span className="inline-flex items-center gap-2">
                                    <Calendar aria-hidden className="size-4" />
                                    {event.starts_at ? new Date(event.starts_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "TBD"}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <Clock aria-hidden className="size-4" />
                                    {event.starts_at ? new Date(event.starts_at).toLocaleTimeString() : "TBD"}
                                </span>
                            </div>
                            <div className="mt-2">
                                <StatusBadge status={event.starts_at && new Date(event.starts_at) > new Date() ? "upcoming" : "ended"} />
                            </div>
                            <div className="mt-3 flex gap-3">
                                <Button
                                    size="md"
                                    variant="tinted"
                                    fullWidth
                                    onClick={() => {
                                        setSelectedEvent(event)
                                        setIsEdit(true)
                                        setLoading(false)
                                        setShowEditEventModal(true)
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="md"
                                    variant="destructive"
                                    fullWidth
                                    onClick={() => {
                                        setSelectedEvent(event)
                                        setLoading(false)
                                        setShowDeleteConfirmation(true)
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showEditEventModal && (
                <EditOscarEvent
                    isOpen={showEditEventModal}
                    onClose={() => {
                        setSelectedEvent({})
                        setShowEditEventModal(false)
                    }}
                    currEvent={selectedEvent}
                    isEdit={isEdit}
                />
            )}

            <DeleteConfirmationModal
                isOpen={showDeleteConfirmation}
                onClose={() => {
                    setShowDeleteConfirmation(false)
                }}
                onConfirm={handleDelete}
            />

            {loading && <FullScreenLoader />}
        </Modal>
    )
}

export default ManageOscarsModal
