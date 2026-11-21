export const resolveSiteBase = (
    env: string | undefined = import.meta.env.VITE_SITE_URL,
    origin: string = window.location.origin
): string => env || origin

export const authRedirectUrl = (path: string, base?: string): string =>
    new URL(path, base ?? resolveSiteBase()).toString()
