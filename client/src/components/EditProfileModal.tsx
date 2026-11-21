import { useState } from "react"
import { useUserData } from "../context/UserContenxt"
import { Avatar } from "../ui/Avatar"
import { Button } from "../ui/Button"
import { Sheet } from "../ui/Sheet"
import ProfileSetup from "./ProfileSetup"

/** Your profile: change your photo here; names are claimed once and changed by the committee. */
const EditProfileModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { profile, member, refetch } = useUserData()
    const [photoOpen, setPhotoOpen] = useState(false)
    const name = profile?.username ?? ""
    return (
        <>
            <Sheet open={isOpen} onClose={onClose} title="Edit profile" fit footer={<Button variant="primary" fullWidth onClick={onClose}>Done</Button>}>
                <div className="flex flex-col items-center gap-2 pb-2 text-center">
                    <Avatar id={member?.id ?? profile?.user_id ?? name} name={name || "You"} src={profile?.image_url} size={96} ring="pebble" />
                    <Button variant="tinted" size="md" onClick={() => setPhotoOpen(true)}>
                        Change photo
                    </Button>
                    <p className="mt-2 text-title-2">{name}</p>
                    {profile?.email && <p className="text-subhead text-label-2">{profile.email}</p>}
                    <p className="text-footnote text-label-2">To change your name, ask Rickey or Kadin.</p>
                </div>
            </Sheet>
            <ProfileSetup
                open={photoOpen}
                title="Change photo"
                onSkip={() => setPhotoOpen(false)}
                onComplete={() => {
                    setPhotoOpen(false)
                    void refetch()
                }}
            />
        </>
    )
}

export default EditProfileModal
