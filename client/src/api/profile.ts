import { supabase } from "../supabaseClient"
import { shrinkImage } from "../lib/imageResize"

const extFor = (f: File): string => {
    if (f.type === "image/png") return "png"
    if (f.type === "image/webp") return "webp"
    if (f.type === "image/gif") return "gif"
    return "jpg"
}

/**
 * Upload a new profile photo and point profiles.image_url at it; resolves to the public URL.
 * Every upload goes to a fresh path (<uid>/<timestamp>.<ext>): the bucket has INSERT but no UPDATE/DELETE policy,
 * so overwriting would be denied. Throws if the profile row was not actually updated (RLS can match 0 rows silently).
 */
export async function saveProfilePhoto(userId: string, file: File): Promise<string> {
    if (!userId) throw new Error("Not signed in.")
    const small = await shrinkImage(file)
    const path = `${userId}/${Date.now()}.${extFor(small)}`
    const up = await supabase.storage.from("profile-pics").upload(path, small, { cacheControl: "31536000", contentType: small.type || undefined })
    if (up.error) throw new Error("Couldn't upload your photo. Try again, or skip for now.")
    const { data: pub } = supabase.storage.from("profile-pics").getPublicUrl(path)
    const url = pub.publicUrl
    const { data, error } = await supabase.from("profiles").update({ image_url: url }).eq("user_id", userId).select("image_url").maybeSingle()
    if (error || !data || data.image_url !== url) throw new Error("Couldn't save your photo. Try again, or skip for now.")
    return url
}
