/** Ask for a profile photo only once the profile has loaded, has no photo (null or blank), and the member has not skipped. */
export function shouldAskForPhoto(loading: boolean, profile: { image_url: string | null } | null, skipped: boolean): boolean {
    if (loading || !profile || skipped) return false
    return !profile.image_url
}
