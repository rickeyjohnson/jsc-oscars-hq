import { useEffect, useState } from "react"
import { invalidateMembers } from "../lib/cache/invalidate"
import { fetchMemberDirectory, type MemberDirectoryEntry } from "../api/members"

const TTL_MS = 30_000
let cache: { at: number; p: Promise<MemberDirectoryEntry[] | null> } | null = null

/** Forget the cached directory (call after someone changes their photo). */
export const invalidateMemberDirectory = (): void => {
    cache = null
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
    useEffect(() => {
        let live = true
        void load().then((d) => live && setDir(d))
        return () => {
            live = false
        }
    }, [])
    return dir
}
