import { useState } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"
import { Sheet } from "../ui/Sheet"
import { Button } from "../ui/Button"
import { Avatar } from "../ui/Avatar"
import { useToast } from "../ui/Toast"

type ProfileSetupProps = {
    open: boolean
    onComplete: () => void
    onSkip: () => void
    title?: string
}

const ProfileSetup = ({ open, onComplete, onSkip, title = "Add your photo" }: ProfileSetupProps) => {
    const { user } = useAuth()
    const toast = useToast()
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [uploadError, setUploadError] = useState("")

    const handleImageUpload = (file: File) => {
        setUploadError("")
        setImage(file)
        setPreview(URL.createObjectURL(file))
    }

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileName = file.name.split(".")[0]
        const filePath = `${fileName}-${Date.now()}`

        const { error } = await supabase.storage
            .from("profile-pics")
            .upload(filePath, file)

        if (error) {
            console.error("Error uploading image: ", error.message)
            setUploadError("Couldn't upload your photo. Try again, or skip for now.")
            setLoading(false)
            return null
        }

        const { data } = await supabase.storage
            .from("profile-pics")
            .getPublicUrl(filePath)

        return data.publicUrl
    }

    const handleImageSubmission = async () => {
        setLoading(true)
        setUploadError("")

        try {
            const url = await uploadImage(image!)
            if (!url) return

            const { error } = await supabase
                .from("profiles")
                .update({ image_url: url })
                .eq("user_id", user?.id ?? "")

            if (error) {
                console.error("error inserting profile image: ", error.message)
                setUploadError("Couldn't save your photo. Try again, or skip for now.")
                return
            }

            toast.show("Photo updated")
            onComplete()
        } catch {
            setUploadError("Couldn't save your photo. Try again, or skip for now.")
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
                <div className="flex flex-col gap-2">
                    <Button variant="primary" fullWidth disabled={!image} loading={loading} loadingLabel="Saving…" onClick={handleImageSubmission}>
                        Continue
                    </Button>
                    <Button variant="plain" fullWidth onClick={onSkip}>
                        Not now
                    </Button>
                </div>
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
