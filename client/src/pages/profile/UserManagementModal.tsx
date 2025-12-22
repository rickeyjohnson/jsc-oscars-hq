import { Link, useNavigate } from "react-router-dom"
import Modal from "../../components/Modal"

const users = [
    { id: "1", name: "Rickey", role: "committee" },
    { id: "2", name: "Alex", role: "member" },
]

const UserManagementModal = () => {
    const navigate = useNavigate();
    return (
        <Modal
            onClose={() => navigate(-1)}
        >
            <h2 className="text-lg font-bold">User Management</h2>
            <ul className="mt-4 space-y-2">
                {users.map((user) => (
                    <li key={user.id} className="flex justify-between">
                        {user.name}
                        <Link
                            to={`/app/profile/users/${user.id}`}
                            state={{ backgroundLocation: { pathname: location.pathname, search: location.search } }}
                        >
                            View
                        </Link>
                    </li>
                ))}
            </ul>
        </Modal>
    )
}

export default UserManagementModal
