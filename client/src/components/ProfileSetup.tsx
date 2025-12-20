import { LoaderCircle, Upload } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../context/AuthContext"

type ProfileSetupProps = {
    onComplete: () => void
}

const slides = [
    {
        title: "You're almost done",
        text: "Just a few quick steps to finish setting up your profile.",
    },
    {
        title: "Add a profile photo",
        text: "This helps people recognize you on the app, as well as serve as your photo submission for the next Oscars.",
    },
    {
        title: "All set!",
        text: "Thanks for completing your profile.",
    },
    {
        title: "Welcome to Oscars HQ ✨",
        text: "",
    },
]

const LAST_SLIDE = slides.length - 1
const IMAGE_UPLOAD_SLIDE = slides.findIndex(
    (slide) => slide.title === "Add a profile photo"
)

const ProfileSetup = ({ onComplete }: ProfileSetupProps) => {
    const { user } = useAuth()
    const [step, setStep] = useState(0)
    const [closing, setClosing] = useState(false)
    const [isVisible, setIsVisible] = useState(!document.hidden)
    const [image, setImage] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleImageUpload = (file: File) => {
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

        const url = await uploadImage(image!)
        if (!url) return

        const { error } = await supabase
            .from("profiles")
            .update({ image_url: url })
            .eq("user_id", user?.id)

        setLoading(false)

        if (error) {
            console.error("error inserting profile image: ", error.message)
        }

        setStep((prev) => prev + 1)
    }

    useEffect(() => {
        if (step === IMAGE_UPLOAD_SLIDE || !isVisible) return

        const timer = setTimeout(() => {
            if (step === LAST_SLIDE) {
                setClosing(true)
                setTimeout(onComplete, 600)
            } else {
                setStep(step + 1)
            }
        }, 5000)

        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, isVisible])

    useEffect(() => {
        const handleVisibilityChange = () => setIsVisible(!document.hidden)
        const handleFocus = () => setIsVisible(true)
        const handleBlur = () => setIsVisible(false)

        document.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("focus", handleFocus)
        window.addEventListener("blur", handleBlur)

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            )
            window.removeEventListener("focus", handleFocus)
            window.removeEventListener("blur", handleBlur)
        }
    }, [])

    return (
        <AnimatePresence>
            {!closing && (
                <motion.div
                    key="profile-setup-container"
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{
                        y: "-110%",
                        opacity: 0,
                        scale: 0.96,
                        filter: "blur(6px)",
                        transition: {
                            duration: 1.25,
                            ease: [0.22, 1, 0.36, 1],
                        },
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen"
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative flex flex-col justify-items items-center w-[80%]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{
                                    opacity: 0,
                                    filter: "blur(8px)",
                                    scale: 0.98,
                                }}
                                animate={{
                                    opacity: 1,
                                    filter: "blur(0px)",
                                    scale: 1,
                                }}
                                exit={{
                                    opacity: 0,
                                    filter: "blur(8px)",
                                    scale: 0.98,
                                }}
                                transition={{ duration: 0.67, ease: "easeOut" }}
                                className="text-center w-full"
                            >
                                <h2 className="font-bold">
                                    {slides[step].title}
                                </h2>
                                <p className="text-[#fffadd]/60 mt-2">
                                    {slides[step].text}
                                </p>

                                {step === IMAGE_UPLOAD_SLIDE && (
                                    <div className="mt-6">
                                        <label className="relative w-32 h-32 mx-auto block cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    e.target.files &&
                                                    handleImageUpload(
                                                        e.target.files[0]
                                                    )
                                                }
                                            />

                                            <div className="w-full h-full rounded-full border border-[#fffadd]/20 bg-amber-100/5 flex items-center justify-center overflow-hidden hover:border-[#fffadd]/40 transition">
                                                {preview ? (
                                                    <img
                                                        src={preview}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Upload className="w-8 h-8 text-[#fffadd]/50" />
                                                )}
                                            </div>
                                        </label>

                                        <button
                                            disabled={!image}
                                            onClick={handleImageSubmission}
                                            className="mt-6 bg-[#fffadd] text-zinc-900 px-6 py-3 rounded-full font-bold disabled:opacity-40 transition"
                                        >
                                            {loading ? (
                                                <LoaderCircle className="animate-spin w-7 h-7" />
                                            ) : (
                                                "Continue"
                                            )}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default ProfileSetup
