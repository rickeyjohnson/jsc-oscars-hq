import { resizeDimensions } from "../ui/logic/avatar"

/** Downscale a photo to at most `max` px (EXIF orientation applied) and re-encode as JPEG. Falls back to the original file on any failure. */
export async function shrinkImage(file: File, max = 512, quality = 0.8): Promise<File> {
    try {
        if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file
        const bmp = await createImageBitmap(file, { imageOrientation: "from-image" })
        const { width, height } = resizeDimensions(bmp.width, bmp.height, max)
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) return file
        ctx.drawImage(bmp, 0, 0, width, height)
        bmp.close?.()
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality))
        if (!blob || blob.size >= file.size) return file
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
    } catch {
        return file
    }
}
