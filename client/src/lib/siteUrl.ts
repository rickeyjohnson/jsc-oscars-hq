export const authRedirectUrl = (
    path: string,
    base: string = import.meta.env.VITE_SITE_URL ?? window.location.origin
): string => new URL(path, base).toString()
