export function formatToYYYYMMDDTHHMM(isoString: string) {
    const date = new Date(isoString)

    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const capitalizeFirstLetter = (string: string | undefined) => {
    if (!string) return "" // Handle empty strings
    return string.charAt(0).toUpperCase() + string.slice(1)
}
