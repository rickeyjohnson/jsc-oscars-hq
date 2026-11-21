import type { MemberDirectoryEntry } from "../api/members"

/** Lookup over the member directory: by member id or (case-insensitively) by name. */
export type MemberFaces = {
    /** The key that drives a person's pebble color everywhere: their member id (the typed name until the directory loads). */
    keyFor(ref: { memberId?: string; name: string }): string
    /** The photo they uploaded for their profile, or null. */
    photoFor(ref: { memberId?: string; name: string }): string | null
}

export function memberFaces(dir: readonly MemberDirectoryEntry[] | null): MemberFaces {
    const byId = new Map((dir ?? []).map((m) => [m.id, m]))
    const byName = new Map((dir ?? []).map((m) => [m.name.trim().toLowerCase(), m]))
    const find = (r: { memberId?: string; name: string }) => (r.memberId ? byId.get(r.memberId) : undefined) ?? byName.get(r.name.trim().toLowerCase())
    return {
        keyFor: (r) => find(r)?.id ?? r.memberId ?? r.name,
        photoFor: (r) => find(r)?.photo ?? null,
    }
}
