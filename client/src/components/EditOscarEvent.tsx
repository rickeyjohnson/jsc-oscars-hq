import { useEffect, useState } from "react"
import Modal, { ModalHeader } from "./Modal"
import { supabase } from "../supabaseClient"
import type { OscarsEvent } from "../context/UserContenxt"
import { capitalizeFirstLetter, formatToYYYYMMDDTHHMM } from "../utils"
import FullScreenLoader from "./FullScreenLoader"
import { Button } from "../ui/Button"
import { SheetActions } from "../ui/SheetActions"

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
                    event.semester ?? undefined
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

    const field = "h-13 w-full rounded-control bg-surface-2 px-4 text-body text-label outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent [color-scheme:dark]"
    const option = (on: boolean) =>
        `flex min-h-14 cursor-pointer items-center gap-3 rounded-card px-4 text-body transition-colors ${on ? "bg-fill ring-2 ring-accent" : "bg-surface-2"}`
    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                footer={
                    <SheetActions>
                        <Button type="submit" form="oscar-event-form">
                            {isEdit ? "Update Event" : "Create Event"}
                        </Button>
                    </SheetActions>
                }
            >
                <ModalHeader title={isEdit ? "Edit Event" : "Add New Event"} description={isEdit ? "Update event details" : "Create a new Oscar event"} />

                <form id="oscar-event-form" onSubmit={handleSubmit} className="space-y-4">
                    <label className="block">
                        <span className="mb-1.5 block text-subhead font-bold text-label-2">Event Name</span>
                        <input type="text" value={oscarEvent.name ?? ""} onChange={(e) => setOscarEvent({ ...oscarEvent, name: e.target.value })} className={field} placeholder="Just Side Chatting Oscars" />
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-subhead font-bold text-label-2">Date</span>
                        <input
                            type="datetime-local"
                            value={oscarEvent.starts_at ? formatToYYYYMMDDTHHMM(oscarEvent.starts_at) : ""}
                            onChange={(e) => setOscarEvent({ ...oscarEvent, starts_at: e.target.value })}
                            required
                            className={field}
                        />
                    </label>
                    <fieldset>
                        <legend className="mb-1.5 text-subhead font-bold text-label-2">Semester</legend>
                        <div className="flex flex-col gap-3">
                            {(["fall", "spring"] as const).map((sem) => (
                                <label key={sem} className={option(oscarEvent.semester === sem)}>
                                    <input type="radio" name="semester" value={sem} required onChange={(e) => setOscarEvent({ ...oscarEvent, semester: e.target.value })} checked={oscarEvent.semester === sem} className="size-4 accent-accent" />
                                    {capitalizeFirstLetter(sem)}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </form>
            </Modal>
            {loading && <FullScreenLoader />}
        </>
    )
}

export default EditOscarEvent
