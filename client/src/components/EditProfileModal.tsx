import Modal, { ModalBody, ModalFooter, ModalHeader } from "./Modal"
import { useUserData } from "../context/UserContenxt"

const EditProfileModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    const { profile } = useUserData()

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader title="Edit Profile" />
            <ModalBody>
                <div className="space-y-6">
                    {/* Profile Picture */}
                    <div className="text-center">
                        <img
                            src={profile?.image_url}
                            alt="profile image"
                            className="w-24 h-24 rounded-full mx-auto mb-4"
                        />

                        <label className="inline-block px-4 py-2 bg-amber-100/10 text-amber-100 rounded-xl text-sm font-medium hover:bg-amber-100/20 transition cursor-pointer border border-amber-100/20">
                            Change Photo
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                            placeholder={profile?.username}
                        />
                    </div>
                </div>
            </ModalBody>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-amber-100/10 text-amber-100 rounded-xl hover:bg-amber-100/20 transition"
                >
                    Cancel
                </button>
                <button className="flex-1 py-3 bg-amber-100 text-zinc-900 rounded-xl font-bold hover:bg-amber-200 transition">
                    Save Changes
                </button>
            </ModalFooter>
        </Modal>
    )
}

export default EditProfileModal
