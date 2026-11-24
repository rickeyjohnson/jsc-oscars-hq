import { supabase } from "../supabaseClient"
import { buildNomineeRows } from "../lib/ballotForm"
import { toUtcIso } from "../lib/time"
import { groupSizeToSave, type BallotSummary } from "../lib/voting"
import type { Ballot, BallotDetail, BallotFormData, BallotStatus, Category, Member, Nominee, Season } from "../types"
import type { RoundEntry } from "../lib/rounds"
import { dedupe } from "../lib/cache/dedup"
import { cacheSet } from "../lib/cache/store"
import { GLOBAL } from "../lib/cache/keys"
import { cachedReleasedDetail, storeBallotDetail } from "../lib/cache/detail"
import { cacheEpoch, invalidateBallots, invalidateResults } from "../lib/cache/invalidate"
import { localUid } from "../lib/cache/uid"
import { classifyReopenError, REOPEN_UNAVAILABLE } from "../lib/reopen"

export const fetchSeasons = async (): Promise<Season[]> => {
    const { data, error } = await supabase.from("seasons").select("*").order("ceremony_at", { ascending: false })
    if (error) throw error
    return (data ?? []) as Season[]
}

export const assertDraft = (status: BallotStatus): void => {
    if (status !== "draft") throw new Error("Only draft ballots can be rewritten")
}

// Saves the form as a draft (insert or update) and rewrites its categories and nominees.
export const saveBallotDraft = async (form: BallotFormData, members: Member[], ballotId?: string): Promise<string> => {
    // One transaction when the database function exists; the older step-by-step path otherwise.
    const { data, error } = await supabase.rpc("save_ballot_draft", {
        p_ballot_id: (ballotId ?? null) as string,
        p_ballot: { season_id: form.season_id, name: form.name.trim(), opens_at: toUtcIso(form.opens_at), closes_at: toUtcIso(form.closes_at), count_in_stats: form.count_in_stats !== false },
        p_categories: form.categories.map((c, i) => ({
            name: c.name,
            description: c.description,
            sort_order: i,
            nominee_mode: c.nominee_mode,
            allow_member_add: c.allow_member_add,
            group_size: groupSizeToSave(c),
            nominees: buildNomineeRows(c, members),
        })),
    })
    if (!error) {
        invalidateBallots()
        return data as string
    }
    if (error.code !== "PGRST202" && error.code !== "42883" && !/could not find the function/i.test(error.message ?? "")) throw error
    try {
        return await saveBallotDraftSteps(form, members, ballotId)
    } finally {
        invalidateBallots() // the step-by-step path can half-finish
    }
}

const saveBallotDraftSteps = async (form: BallotFormData, members: Member[], ballotId?: string): Promise<string> => {
    const fields = {
        season_id: form.season_id,
        name: form.name.trim(),
        opens_at: toUtcIso(form.opens_at),
        closes_at: toUtcIso(form.closes_at),
        count_in_stats: form.count_in_stats !== false,
        status: "draft" as const,
    }
    let id = ballotId
    if (id) {
        const { data: existing, error: readError } = await supabase.from("ballots").select("status").eq("id", id).single()
        if (readError) throw readError
        assertDraft(existing.status as BallotStatus)
        const { data: updated, error } = await supabase.from("ballots").update(fields).eq("id", id).eq("status", "draft").select("id")
        if (error) throw error
        if (!updated || updated.length === 0) throw new Error("Only draft ballots can be rewritten")
        const { error: delError } = await supabase.from("categories").delete().eq("ballot_id", id)
        if (delError) throw delError
    } else {
        const { data, error } = await supabase.from("ballots").insert(fields).select("id").single()
        if (error) throw error
        id = data.id as string
    }

    for (const [index, category] of form.categories.entries()) {
        const { data: cat, error } = await supabase
            .from("categories")
            .insert({
                ballot_id: id,
                name: category.name,
                description: category.description,
                sort_order: index,
                nominee_mode: category.nominee_mode,
                allow_member_add: category.allow_member_add,
                group_size: groupSizeToSave(category),
            })
            .select("id")
            .single()
        if (error) throw error
        const rows = buildNomineeRows(category, members).map((r) => ({ ...r, category_id: cat.id as string }))
        if (rows.length > 0) {
            const { error: nomError } = await supabase.from("nominees").insert(rows)
            if (nomError) throw nomError
        }
    }
    return id
}

export const setBallotStatus = async (ballotId: string, status: BallotStatus): Promise<void> => {
    const { error } = await supabase.from("ballots").update({ status }).eq("id", ballotId)
    if (error) throw error
    invalidateBallots()
}

// Loads a ballot with its categories/nominees. Round ballots show only what is in round_nominees.
// Only a RELEASED ballot is ever served from the per-user cache (release is one-way). Open/closed/draft always read the server
// (a fresh copy is stored for display-only first paint, see lib/cache/detail.ts; drafts are never stored).
export const fetchBallotDetail = async (ballotId: string): Promise<BallotDetail> => {
    const uid = await localUid()
    if (uid) {
        const hit = cachedReleasedDetail(uid, ballotId)
        if (hit) return hit
    }
    return dedupe(`bd:${ballotId}`, async () => {
        const epoch = cacheEpoch()
        const detail = await fetchBallotDetailRaw(ballotId)
        if (uid && epoch === cacheEpoch()) storeBallotDetail(uid, detail)
        return detail
    })
}

const fetchBallotDetailRaw = async (ballotId: string): Promise<BallotDetail> => {
    const { data: ballot, error } = await supabase.from("ballots").select("*").eq("id", ballotId).single()
    if (error) throw error
    const isRound = ballot.round !== "main" && Boolean(ballot.parent_ballot_id)
    const sourceBallotId = isRound ? (ballot.parent_ballot_id as string) : ballotId

    let allowed: Set<string> | null = null
    let allowedCategories: Set<string> | null = null
    if (isRound) {
        const { data: rn, error: rnError } = await supabase.from("round_nominees").select("category_id, nominee_id").eq("ballot_id", ballotId)
        if (rnError) throw rnError
        allowed = new Set((rn ?? []).map((r) => r.nominee_id))
        allowedCategories = new Set((rn ?? []).map((r) => r.category_id))
    }

    const { data: cats, error: catError } = await supabase
        .from("categories")
        .select("*, nominees(*)")
        .eq("ballot_id", sourceBallotId)
        .order("sort_order")
    if (catError) throw catError

    const categories: Category[] = (cats ?? [])
        .filter((c) => !allowedCategories || allowedCategories.has(c.id))
        .map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description ?? "",
            order: c.sort_order,
            nominee_mode: c.nominee_mode as Category["nominee_mode"],
            allow_member_add: c.allow_member_add,
            group_size: c.group_size ?? null,
            nominees: ((c.nominees ?? []) as Array<{ id: string; display_name: string; secondary_text: string | null; type: Nominee["type"]; member_ids: string[] }>)
                .filter((n) => !allowed || allowed.has(n.id))
                .map((n) => ({ id: n.id, display_name: n.display_name, secondary_text: n.secondary_text ?? undefined, type: n.type, member_ids: n.member_ids ?? [] }))
                .sort((a, b) => a.display_name.localeCompare(b.display_name)),
        }))

    return { ...(ballot as Ballot), categories }
}

export const fetchCurrentSeason = async (): Promise<Season | null> => {
    const { data, error } = await supabase.from("seasons").select("*").order("ceremony_at", { ascending: false, nullsFirst: false }).limit(1)
    if (error) throw error
    const season = ((data ?? [])[0] as Season | undefined) ?? null
    // A fresh response that shows the release is the only thing allowed to unlock cached results (api/results.ts). Never cache "not released".
    if (season?.results_released_at) cacheSet(GLOBAL, `released:${season.id}`, season.results_released_at)
    return season
}

// Visible (RLS) non-draft ballots with category counts and the caller's own vote counts.
export const fetchBallotSummaries = async (includeDrafts = false): Promise<BallotSummary[]> => {
    let query = supabase.from("ballots").select("*")
    if (!includeDrafts) query = query.neq("status", "draft")
    const { data: ballots, error } = await query.order("closes_at", { ascending: true })
    if (error) throw error
    const list = (ballots ?? []) as Ballot[]
    if (list.length === 0) return []
    const ids = list.map((b) => b.id)
    const sourceIds = list.filter((b) => !(b.round !== "main" && b.parent_ballot_id)).map((b) => b.id)

    const { data: auth, error: authError } = await supabase.auth.getSession()
    if (authError) throw authError
    const uid = auth.session?.user.id ?? ""

    const [cats, rounds, votes] = await Promise.all([
        sourceIds.length > 0 ? supabase.from("categories").select("id, ballot_id").in("ballot_id", sourceIds) : Promise.resolve({ data: [] as { id: string; ballot_id: string }[], error: null }),
        supabase.from("round_nominees").select("ballot_id, category_id").in("ballot_id", ids),
        supabase.from("votes").select("ballot_id, category_id").in("ballot_id", ids).eq("voter_id", uid),
    ])
    if (cats.error) throw cats.error
    if (rounds.error) throw rounds.error
    if (votes.error) throw votes.error

    const catCount = new Map<string, number>()
    for (const c of cats.data ?? []) catCount.set(c.ballot_id, (catCount.get(c.ballot_id) ?? 0) + 1)
    const roundCats = new Map<string, Set<string>>()
    for (const r of rounds.data ?? []) roundCats.set(r.ballot_id, (roundCats.get(r.ballot_id) ?? new Set()).add(r.category_id))
    const voted = new Map<string, Set<string>>()
    for (const v of votes.data ?? []) voted.set(v.ballot_id, (voted.get(v.ballot_id) ?? new Set()).add(v.category_id))

    return list.map((b) => {
        const isRound = b.round !== "main" && Boolean(b.parent_ballot_id)
        return {
            ...b,
            category_count: isRound ? (roundCats.get(b.id)?.size ?? 0) : (catCount.get(b.id) ?? 0),
            my_vote_count: voted.get(b.id)?.size ?? 0,
        }
    })
}

// Round ballots (tiebreak / committee) linked to a main ballot, oldest first.
export const fetchRoundBallots = async (mainId: string): Promise<Ballot[]> => {
    const { data, error } = await supabase.from("ballots").select("*").eq("parent_ballot_id", mainId).order("created_at")
    if (error) throw error
    return (data ?? []) as Ballot[]
}

export class RoundExistsError extends Error {}
export const ROUND_EXISTS = "Someone already started it."

// Creates an open round ballot under the main ballot with only the given nominees.
// Refuses a second round of the same kind; deletes the ballot again if its nominees fail to save.
export const createRoundBallot = async (
    main: Ballot,
    round: "tiebreak" | "committee",
    entries: RoundEntry[],
    closesAt: string,
): Promise<string> => {
    if (main.round !== "main" || main.parent_ballot_id) throw new Error("Rounds must hang off the main ballot")
    const rows = entries.flatMap((e) => e.nominee_ids.map((nominee_id) => ({ category_id: e.category_id, nominee_id })))
    if (rows.length === 0) throw new Error("No categories need this round")
    const opensAt = new Date().toISOString()
    if (new Date(closesAt).getTime() <= Date.now()) throw new Error("The round must close in the future")

    const existing = await fetchRoundBallots(main.id)
    if (existing.some((b) => b.round === round)) throw new RoundExistsError(ROUND_EXISTS)

    const { data, error } = await supabase
        .from("ballots")
        .insert({
            season_id: main.season_id,
            parent_ballot_id: main.id,
            name: `${main.name} – ${round === "tiebreak" ? "Tiebreak" : "Committee"}`,
            round,
            status: "open",
            opens_at: opensAt,
            closes_at: closesAt,
        })
        .select("id")
        .single()
    // the unique index (parent_ballot_id, round) turns a simultaneous second start into this error
    if (error?.code === "23505") throw new RoundExistsError(ROUND_EXISTS)
    if (error) throw error
    const id = data.id as string

    const { error: rnError } = await supabase.from("round_nominees").insert(rows.map((r) => ({ ...r, ballot_id: id })))
    if (rnError) {
        const { error: delError } = await supabase.from("ballots").delete().eq("id", id)
        throw new Error(
            `Couldn't save the round's nominees (${rnError.message}). ${delError ? `The half-made round ballot ${id} is still there; delete it in Manage Ballots.` : "The round was removed; try again."}`,
        )
    }
    return id
}

// Reopen a closed ballot with a new close time (committee only; the rules live in the reopen_ballot database function).
export class ReopenUnavailableError extends Error {}
export class ReopenRefusedError extends Error {}

export const reopenBallot = async (ballotId: string, closesAtIso: string): Promise<void> => {
    const { error } = await supabase.rpc("reopen_ballot", { p_ballot_id: ballotId, p_closes_at: closesAtIso })
    if (!error) {
        invalidateBallots()
        return
    }
    const kind = classifyReopenError(error)
    if (kind === "unavailable") throw new ReopenUnavailableError(REOPEN_UNAVAILABLE)
    if (kind === "refused") throw new ReopenRefusedError(error.message)
    throw error
}

// Committee only (RLS). Marks a ballot as practice (false) or real (true) for stats.
export const setBallotCountInStats = async (ballotId: string, count: boolean): Promise<void> => {
    const { data, error } = await supabase.from("ballots").update({ count_in_stats: count }).eq("id", ballotId).select("id")
    if (error) throw error
    if ((data ?? []).length === 0) throw new Error("Couldn't change this ballot. Only the committee can.")
    invalidateBallots()
    invalidateResults()
}

// Delete a ballot for good (committee only, enforced by RLS). Categories, nominees, votes, results and
// round ballots go with it through ON DELETE CASCADE. Zero rows back means RLS refused it or it is already gone.
export class DeleteRefusedError extends Error {}
export const DELETE_REFUSED = "Couldn't delete this ballot. Only the committee can delete a ballot, or it was already deleted."

export const deleteBallot = async (ballotId: string): Promise<void> => {
    const { data, error } = await supabase.from("ballots").delete().eq("id", ballotId).select("id")
    if (error) throw error
    if ((data ?? []).length === 0) throw new DeleteRefusedError(DELETE_REFUSED)
    invalidateBallots()
    invalidateResults()
}

// Committee only (RLS). Returns false when no row changed, i.e. the caller has no right to edit the season.
export const updateSeason = async (seasonId: string, fields: { name: string; ceremony_at: string | null; location: string | null }): Promise<boolean> => {
    const { data, error } = await supabase.from("seasons").update(fields).eq("id", seasonId).select("id")
    if (error) throw error
    return (data ?? []).length === 1
}
