import { saveProfilePhoto } from "../api/profile"
import { useUserData } from "../context/UserContenxt"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Sheet } from "../ui/Sheet"
import { SheetActions } from "../ui/SheetActions"
import { Button } from "../ui/Button"
import { Avatar } from "../ui/Avatar"
import { useToast } from "../ui/Toast"
import { OFFLINE_REASON, useOnline } from "../lib/online"

type ProfileSetupProps = {
    open: boolean
    onComplete: () => void
    onSkip: () => void
    title?: string
}

const ProfileSetup = ({ open, onComplete, onSkip, title = "Add your photo" }: ProfileSetupProps) => {
    const { user } = useAuth()
    const { applyPhoto } = useUserData()
    const toast = useToast()
    const online = useOnline()
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [uploadError, setUploadError] = useState("")

    const handleImageUpload = (file: File) => {
        setUploadError("")
        setImage(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleImageSubmission = async () => {
        if (!image || !user) return
        setLoading(true)
        setUploadError("")
        try {
            const url = await saveProfilePhoto(user.id, image)
            applyPhoto(url)
            toast.show("Photo updated")
            onComplete()
        } catch (e) {
            console.error("profile photo save failed: ", e)
            setUploadError(e instanceof Error && e.message ? e.message : "Couldn't save your photo. Try again, or skip for now.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onSkip}
            title={title}
            fit
            footer={
                <SheetActions>
                    {!online && <p className="text-center text-footnote text-label-2">{OFFLINE_REASON}</p>}
                    <Button variant="primary" fullWidth disabled={!image || !online} loading={loading} loadingLabel="Saving…" onClick={handleImageSubmission}>
                        Continue
                    </Button>
                    <Button variant="tinted" fullWidth onClick={onSkip}>
                        Not now
                    </Button>
                </SheetActions>
            }
        >
            <div className="flex flex-col items-center gap-4 pt-2 text-center">
                {preview ? (
                    <Avatar id={user?.id ?? "me"} name="Your photo preview" src={preview} size={96} ring="lemon" />
                ) : (
                    <span aria-hidden className="grid size-24 place-items-center rounded-full border-2 border-dashed border-label-3 text-title-1 text-label-3">
                        +
                    </span>
                )}
                <p className="text-callout text-label-2">Your face shows up on ballots, podiums and the leaderboard.</p>
                <label className="inline-flex h-11 cursor-pointer items-center rounded-full bg-fill px-5 text-subhead font-bold text-label focus-within:ring-2 focus-within:ring-accent">
                    <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    />
                    Choose photo
                </label>
                {uploadError && (
                    <p role="alert" className="text-footnote text-danger">
                        {uploadError}
                    </p>
                )}
            </div>
        </Sheet>
    )
}

export default ProfileSetup
