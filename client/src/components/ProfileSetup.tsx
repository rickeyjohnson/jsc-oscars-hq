import { LoaderCircle, Pencil } from "lucide-react"

const ProfileSetup = () => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (
            e.target.name === "pfp" &&
            e.target instanceof HTMLInputElement &&
            e.target.files &&
            e.target.files[0]
        ) {
            const img = e.target.files[0]

            return
        }
    }

    // const uploadImage = async (file: File): Promise<string | null> => {
    //     const filePath = `${file.name}-${Date.now()}`

    //     console.log("uploading photo to storage")

    //     const { error } = await supabase.storage
    //         .from("profile-pics")
    //         .upload(filePath, file)

    //     if (error) {
    //         console.error("Error uploading image: ", error.message)
    //         return null
    //     }

    //     console.log("upload successful")
    //     console.log("getting url for image")

    //     const { data } = await supabase.storage
    //         .from("profile-pics")
    //         .getPublicUrl(filePath)

    //     console.log("url successful")

    //     return data.publicUrl
    // }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 h-screen">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            <div className="relative flex flex-col justify-items items-center">
                <LoaderCircle className="animate-spin w-10 h-10 mb-7" />
                <p>Please verify email to continue</p>
                <div className="relative shrink-0 w-20 h-20 mr-[1.5rem]">
                    <img
                        src={"/blank-pfp.png"}
                        className="rounded-full h-20 w-20"
                    />
                    <div className="bg-black rounded-full flex items-center justify-center p-2 w-fit absolute -bottom-2 -right-2 cursor-pointer">
                        <Pencil size={15} />
                    </div>
                    <input
                        name="pfp"
                        type="file"
                        accept="image/*"
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleChange}
                        required={true}
                    />
                </div>
            </div>
        </div>
    )
}

export default ProfileSetup
