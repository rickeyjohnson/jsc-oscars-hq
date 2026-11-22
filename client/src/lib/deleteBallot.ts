import { DeleteRefusedError } from "../api/ballots"

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`

export type DeleteFacts = { name: string; round: "main" | "tiebreak" | "committee"; categories: number; nominees: number; votes: number; results: number; childRounds: number }

export const deleteConfirm = (f: DeleteFacts): { title: string; message: string; confirmLabel: string; destructive: true } => {
    const erased =
        f.round === "main"
            ? `its ${plural(f.categories, "category", "categories")}, ${plural(f.nominees, "nominee")}, every member's votes (${f.votes}) and ${plural(f.results, "recorded result")}`
            : `every member's votes on it (${f.votes}) and the ${plural(f.results, "result")} it recorded`
    const parent =
        f.round === "main"
            ? f.childRounds > 0
                ? ` Its ${plural(f.childRounds, "tiebreak or committee round", "tiebreak and committee rounds")} will be deleted too.`
                : ""
            : " Its main ballot stays, but any category decided by this round goes back to undecided."
    return {
        title: `Delete ${f.name}?`,
        message: `This permanently erases ${erased}.${parent} This cannot be undone.`,
        confirmLabel: "Delete ballot",
        destructive: true,
    }
}

/** A specific, human message for a failed delete. */
export const deleteFailure = (e: unknown): string => {
    if (e instanceof DeleteRefusedError) return e.message
    const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : ""
    if (/fetch|network|offline/i.test(msg)) return "Couldn't delete the ballot because the connection dropped. Nothing was removed. Try again."
    return `Couldn't delete the ballot${msg ? ` (${msg})` : ""}. Nothing was removed.`
}
