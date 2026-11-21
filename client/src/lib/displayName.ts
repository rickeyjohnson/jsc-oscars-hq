// The name people know someone by: the claimed member name, else the profile display name, else the username.
export const displayName = (member: { name: string } | null | undefined, profile: { display_name?: string | null; username?: string | null } | null | undefined): string =>
    member?.name || profile?.display_name || profile?.username || ""
