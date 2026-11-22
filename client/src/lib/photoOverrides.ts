import { useMemo, useSyncExternalStore } from "react"

// Photos changed in this session, by member id. Every avatar consumer merges these over whatever it fetched,
// so a new photo shows everywhere at once and a stale in-flight/cached fetch can never put the old one back.
const overrides = new Map<string, string>()
const listeners = new Set<() => void>()
let version = 0

export const setPhotoOverride = (memberId: string, url: string): void => {
    overrides.set(memberId, url)
    version++
    listeners.forEach((l) => l())
}
export const getPhotoOverride = (memberId: string): string | undefined => overrides.get(memberId)
export const clearPhotoOverrides = (): void => {
    overrides.clear()
    version++
    listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => void listeners.delete(l)
}
const getVersion = () => version

export const applyOverridesToMap = (m: Record<string, string | null>): Record<string, string | null> => {
    if (overrides.size === 0) return m
    const out = { ...m }
    overrides.forEach((url, id) => {
        out[id] = url
    })
    return out
}

/** Re-renders when any photo changes; returns `avatars` with the session's changed photos applied. */
export function useAvatarOverrides(avatars: Record<string, string | null>): Record<string, string | null> {
    const v = useSyncExternalStore(subscribe, getVersion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => applyOverridesToMap(avatars), [avatars, v])
}

export function usePhotoVersion(): number {
    return useSyncExternalStore(subscribe, getVersion)
}
