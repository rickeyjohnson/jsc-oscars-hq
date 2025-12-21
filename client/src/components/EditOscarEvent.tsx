import { useEffect, useState } from "react"
import Modal, { ModalHeader } from "./Modal"
import { supabase } from "../supabaseClient"
import type { OscarsEvent } from "../context/UserContenxt"
import { capitalizeFirstLetter, formatToYYYYMMDDTHHMM } from "../utils"
import FullScreenLoader from "./FullScreenLoader"

const EditOscarEvent = ({
    isOpen,
    onClose,
    isEdit,
    currEvent,
}: {
    isOpen: boolean
    onClose: () => void
    isEdit: boolean
    currEvent: OscarsEvent
}) => {
    const [oscarEvent, setOscarEvent] = useState<OscarsEvent>(currEvent)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const event = { ...oscarEvent }

        if (event.starts_at) {
            event.starts_at = new Date(event.starts_at).toISOString()
            event.ends_at = new Date(
                new Date(event.starts_at).getTime() + 10800000
            ).toISOString()

            if (!event.name) {
                event.name = `Just Side Chatting Oscars: ${capitalizeFirstLetter(
                    event.semester
                )} ${new Date(event.starts_at).getFullYear()}`
            }
        }

        // supabase it here, blud
        const { error } = await supabase
            .from("oscarsEvents")
            .upsert({ ...event })

        if (error) {
            console.error(
                "Error upserting into oscars event table",
                error.message
            )
            return
        }

        setLoading(false)
        onClose()
    }

    useEffect(() => {
        console.log(oscarEvent)
    }, [oscarEvent])

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalHeader
                    title={isEdit ? "Edit Event" : "Add New Event"}
                    description={
                        isEdit
                            ? "Update event details"
                            : "Create a new Oscar event"
                    }
                />

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Event Name
                            </label>
                            <input
                                type="text"
                                value={oscarEvent.name}
                                onChange={(e) =>
                                    setOscarEvent({
                                        ...oscarEvent,
                                        name: e.target.value,
                                    })
                                }
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                                placeholder="Just Side Chatting Oscars"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Date
                            </label>
                            <input
                                type="datetime-local"
                                value={
                                    oscarEvent.starts_at
                                        ? formatToYYYYMMDDTHHMM(
                                              oscarEvent.starts_at
                                          )
                                        : ""
                                }
                                onChange={(e) =>
                                    setOscarEvent({
                                        ...oscarEvent,
                                        starts_at: e.target.value,
                                    })
                                }
                                required={true}
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 [color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Semester
                            </label>
                            <div className="flex flex-col space-y-3">
                                <label
                                    className={`items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition ${
                                        oscarEvent.semester === "fall"
                                            ? "bg-amber-100/10 border-amber-100"
                                            : "bg-amber-100/5 border-amber-100/10 hover:bg-amber-100/10"
                                    }}`}
                                >
                                    <input
                                        type="radio"
                                        name="semester"
                                        value="fall"
                                        required={true}
                                        onChange={(e) => {
                                            setOscarEvent({
                                                ...oscarEvent,
                                                semester: e.target.value,
                                            })
                                        }}
                                        checked={oscarEvent.semester === "fall"}
                                        className="ml-5 mr-4 bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 [color-scheme:dark]"
                                    />
                                    Fall
                                </label>
                                <label
                                    className={`items-center justify-between gap-4 p-4 rounded-2xl border cursor-pointer transition ${
                                        oscarEvent.semester === "spring"
                                            ? "bg-amber-100/10 border-amber-100"
                                            : "bg-amber-100/5 border-amber-100/10 hover:bg-amber-100/10"
                                    }}`}
                                >
                                    <input
                                        type="radio"
                                        value="spring"
                                        name="semester"
                                        required={true}
                                        onChange={(e) => {
                                            setOscarEvent({
                                                ...oscarEvent,
                                                semester: e.target.value,
                                            })
                                        }}
                                        checked={
                                            oscarEvent.semester === "spring"
                                        }
                                        className="ml-5 mr-4 bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 [color-scheme:dark]"
                                    />
                                    Spring
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 text-sm">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-amber-100/10 text-amber-100 rounded-xl font-medium hover:bg-amber-100/20 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-amber-100 text-zinc-900 rounded-xl font-bold hover:bg-amber-200 transition"
                        >
                            {isEdit ? "Update Event" : "Create Event"}
                        </button>
                    </div>
                </form>
            </Modal>
            {loading && <FullScreenLoader />}
        </>
    )
}

export default EditOscarEvent
