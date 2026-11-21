import { useUserData } from "../context/UserContenxt"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { Sheet } from "../ui/Sheet"

/** Read-only profile card: names are claimed once and changed by the committee. */
const EditProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { profile } = useUserData()
    const name = profile?.username ?? ""
    return (
        <Sheet open={isOpen} onClose={onClose} title="Edit profile" detents={["medium"]} footer={<Button variant="primary" fullWidth onClick={onClose}>Done</Button>}>
            <div className="flex flex-col items-center gap-3 py-2 text-center">
                <Avatar id={profile?.user_id ?? name} name={name || "You"} src={profile?.image_url} size={96} ring="pebble" />
                <p className="text-title-2">{name}</p>
                {profile?.email && <p className="text-subhead text-label-2">{profile.email}</p>}
                <p className="text-footnote text-label-2">Your name was claimed when you joined. To change your name or photo, ask Rickey or Kadin.</p>
            </div>
        </Sheet>
    )
}

export default EditProfileModal
