import React from "react"
import Modal, { ModalBody, ModalFooter, ModalHeader } from "./Modal"

const CreateOscarsEvent = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    const handleSubmit = () => {
        return
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title={"Create New Oscars Event"} description="You can change this any time" width="w-full"/>
            <ModalBody>
                <div className="space-y-4">
                    <form className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Wins
                            </label>
                            <input
                                type="number"
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                                required={true}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Nominations
                            </label>
                            <input
                                type="number"
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                                required={true}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Win Rate (%)
                            </label>
                            <input
                                type="number"
                                className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                                required={true}
                            />
                        </div>
                    </form>
                </div>
            </ModalBody>
            <ModalFooter>
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-amber-100/10 text-amber-100 rounded-xl font-medium hover:bg-amber-100/20 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    type="submit"
                    className="flex-1 py-3 bg-amber-100 text-zinc-900 rounded-xl font-bold hover:bg-amber-200 transition"
                >
                    Save Changes
                </button>
            </ModalFooter>
        </Modal>
    )
}

export default CreateOscarsEvent
