import { MessageSquare, Plus } from "lucide-react"
import { useState } from "react"

// TODO: filter for newer announcements, create announcements props, etc...
const AnnouncementModal = ({ closeModal }: { closeModal: () => void }) => {
    const [announcementFormData, setAnnouncementFormData] = useState({
        title: "",
        description: "",
    })

    const handleAnnouncementSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        // TODO: handle new announcements w/ subscribers and everything
    }

    return (
        <form
            className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen"
            onSubmit={handleAnnouncementSubmit}
        >
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={closeModal}
            ></div>
            <div className="relative bg-zinc-900 border border-amber-100/20 rounded-3xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-black text-amber-100 mb-2">
                    Post Announcement
                </h2>
                <p className="text-sm text-amber-100/60 mb-6">
                    Hear ye, hear ye, my fellow JSC-ers.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Headline
                        </label>
                        <input
                            type="text"
                            value={announcementFormData.title}
                            onChange={(e) =>
                                setAnnouncementFormData({
                                    ...announcementFormData,
                                    title: e.target.value,
                                })
                            }
                            className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100"
                            placeholder="Farmer Refuted"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Details
                        </label>
                        <textarea
                            value={announcementFormData.description}
                            onChange={(e) =>
                                setAnnouncementFormData({
                                    ...announcementFormData,
                                    description: e.target.value,
                                })
                            }
                            className="w-full bg-amber-100/5 border border-amber-100/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-100/30 transition text-amber-100 resize-none"
                            placeholder="Heed not the rabble who scream revolution. They have not your interest at heart."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={closeModal}
                        className="flex-1 py-3 bg-amber-100/10 text-amber-100 rounded-xl font-medium hover:bg-amber-100/20 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-3 bg-amber-100 text-black rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition"
                    >
                        Post
                    </button>
                </div>
            </div>
        </form>
    )
}

const Announcement = () => {
    return (
        <div className="bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-zinc-900 font-bold flex-shrink-0">
                    A
                </div>
                <div className="flex-1">
                    <div className="font-bold text-amber-100 mb-1">
                        Voting Opens Tomorrow!
                    </div>
                    <p className="text-sm text-amber-100/70">
                        All category ballots will be available starting Dec 17th
                        at 12:00 AM EST.
                    </p>
                    <div className="text-xs text-amber-100/40 mt-2">
                        2 hours ago
                    </div>
                </div>
            </div>
        </div>
    )
}

const Announcements = () => {
    const [showAnnouncementsModal, setAnnouncementsModal] = useState(false)

    const closeAnnouncementsModal = () => {
        setAnnouncementsModal(false)
    }

    return (
        <>
            {showAnnouncementsModal && (
                <AnnouncementModal closeModal={closeAnnouncementsModal} />
            )}

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Announcements
                    </h3>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(() => {
                        // placeholder array
                        return <Announcement />
                    })}
                    <button
                        onClick={() => setAnnouncementsModal(true)}
                        className="w-full bg-amber-100 text-zinc-900 rounded-xl py-3 font-bold hover:bg-amber-200 transition flex items-center justify-center gap-2"
                    >
                        Create Announcement
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </>
    )
}

export default Announcements
