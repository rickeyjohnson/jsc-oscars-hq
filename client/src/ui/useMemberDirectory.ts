import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { getPhotoOverride, usePhotoVersion } from "../lib/photoOverrides"
import { invalidateMembers } from "../lib/cache/invalidate"
import { fetchMemberDirectory, type MemberDirectoryEntry } from "../api/members"

const TTL_MS = 30_000
let cache: { at: number; p: Promise<MemberDirectoryEntry[] | null> } | null = null

/** Forget the cached directory (call after someone changes their photo). */
let gen = 0
const genListeners = new Set<() => void>()
const subscribeGen = (l: () => void) => {
    genListeners.add(l)
    return () => void genListeners.delete(l)
}
const getGen = () => gen
export const invalidateMemberDirectory = (): void => {
    cache = null
    gen++
    genListeners.forEach((l) => l())
    invalidateMembers()
}

const load = (): Promise<MemberDirectoryEntry[] | null> => {
    if (!cache || Date.now() - cache.at > TTL_MS) {
        const p = Promise.resolve()
            .then(() => fetchMemberDirectory())
            .catch(() => null) // faces fall back to initials
        cache = { at: Date.now(), p }
        void p.then((v) => {
            if (v === null && cache?.p === p) cache = null
        })
    }
    return cache.p
}

/** The member directory (id, name, uploaded photo), shared across the app. Null until loaded or when it failed. */
export function useMemberDirectory(): MemberDirectoryEntry[] | null {
    const [dir, setDir] = useState<MemberDirectoryEntry[] | null>(null)
    const gen = useSyncExternalStore(subscribeGen, getGen)
    useEffect(() => {
        let live = true
        void load().then((d) => live && setDir((prev) => d ?? prev))
        return () => {
            live = false
        }
    }, [gen])
    const v = usePhotoVersion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => (dir ? dir.map((m) => ({ ...m, photo: getPhotoOverride(m.id) ?? m.photo })) : dir), [dir, v])
}
