import type { Member } from "../types"

export type MemberRow = { id: string; name: string; userId: string | null; status: "signed up" | "available"; isYou: boolean }

export const memberSummary = (members: Member[]): string =>
    `${members.length} names · ${members.filter((x) => x.user_id).length} signed up`

export const resetWarning = (name: string, voteCount: number): string =>
    `This deletes ${name}'s ${voteCount} ${voteCount === 1 ? "vote" : "votes"} and frees the name so they can sign up again. Their login also has to be deleted in Supabase (Auth → Users).`

export const memberRows = (members: Member[], myUserId: string | null): MemberRow[] =>
    [...members]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((x) => ({
            id: x.id,
            name: x.name,
            userId: x.user_id,
            status: x.user_id ? "signed up" : "available",
            isYou: !!x.user_id && x.user_id === myUserId,
        }))
