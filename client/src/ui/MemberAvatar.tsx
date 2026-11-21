import { useMemo } from "react"
import { Avatar } from "./Avatar"
import { useMemberDirectory } from "./useMemberDirectory"
import { memberFaces } from "../lib/memberAvatar"
import type { AvatarRing, AvatarSize } from "./logic/variants"

/** A member's face: the photo they uploaded for their profile, else initials on their pebble. Same color and photo everywhere. */
export function MemberAvatar({ memberId, name, size, ring, decorative }: { memberId?: string; name: string; size: AvatarSize; ring?: AvatarRing; decorative?: boolean }) {
    const dir = useMemberDirectory()
    const f = useMemo(() => memberFaces(dir), [dir])
    return <Avatar id={f.keyFor({ memberId, name })} name={name} src={f.photoFor({ memberId, name })} size={size} ring={ring} decorative={decorative} />
}
