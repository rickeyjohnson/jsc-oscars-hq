import { useMemo } from "react"
import { useMemberDirectory } from "./useMemberDirectory"
import { memberFaces } from "../lib/memberAvatar"
import { avatarFallback } from "./logic/avatar"
import type { PebbleName } from "./tokens"

/** A member's fixed pebble, the same one their face uses everywhere (driven by the shared member directory). */
export function useMemberPebble(): (memberId: string, name: string) => PebbleName {
    const dir = useMemberDirectory()
    const faces = useMemo(() => memberFaces(dir), [dir])
    return (memberId, name) => avatarFallback(faces.keyFor({ memberId, name }))
}
