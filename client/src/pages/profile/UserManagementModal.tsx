import { ChevronRight } from "lucide-react"
import Modal, {
    ModalBody,
    ModalFooter,
    ModalHeader,
} from "../../components/Modal"

const users = [
    { id: "1", name: "Rickey", role: "committee" },
    { id: "2", name: "Alex", role: "member" },
    { id: "3", name: "Alex", role: "member" },
    { id: "4", name: "Alex", role: "member" },
    { id: "5", name: "Alex", role: "member" },
    { id: "6", name: "Alex", role: "member" },
    { id: "7", name: "Alex", role: "member" },
]

// const colors = []

const UserManagementModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean
    onClose: () => void
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                title="User Management"
                description="View and edit user statistics"
            />
            <ModalBody>
                {users.map((user) => (
                    <button
                        key={user.id}
                        onClick={() => {
                            // setSelectedUser(user)
                            // setEditUserStats({
                            //     wins: user.wins,
                            //     nominations: user.nominations,
                            //     winRate: user.winRate,
                            //     categoriesWon: user.categoriesWon || [],
                            // })
                            // setShowEditUserModal(true)
                        }}
                        className="w-full bg-amber-100/5 border border-amber-100/10 rounded-2xl p-4 hover:bg-amber-100/10 transition text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={`w-10 h-10 ${`bg-purple-500`} rounded-full flex items-center justify-center text-white font-black text-lg`}
                            >
                                R
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-amber-100 text-md">
                                    {user.name}
                                </div>
                                <div className="text-xs text-amber-100/60">
                                    10 wins • 100 nominations • 10% rate
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-100/40" />
                        </div>
                    </button>
                ))}
            </ModalBody>
            <ModalFooter>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-amber-100/10 text-amber-100 rounded-xl font-medium hover:bg-amber-100/20 transition"
                >
                    Close
                </button>
            </ModalFooter>
        </Modal>
    )
}

export default UserManagementModal
