import { supabase } from "../supabaseClient"
import { buildNomineeRows } from "../lib/ballotForm"
import { toUtcIso } from "../lib/time"
import type { BallotSummary } from "../lib/voting"
import type { Ballot, BallotDetail, BallotFormData, BallotStatus, Category, Member, Nominee, Season } from "../types"

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
    const fields = {
        season_id: form.season_id,
        name: form.name.trim(),
        opens_at: toUtcIso(form.opens_at),
        closes_at: toUtcIso(form.closes_at),
        status: "draft" as const,
    }
    let id = ballotId
    if (id) {
        const { data: existing, error: readError } = await supabase.from("ballots").select("status").eq("id", id).single()
        if (readError) throw readError
        assertDraft(existing.status as BallotStatus)
        const { error } = await supabase.from("ballots").update(fields).eq("id", id)
        if (error) throw error
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
}

// Loads a ballot with its categories/nominees. Round ballots show only what is in round_nominees.
export const fetchBallotDetail = async (ballotId: string): Promise<BallotDetail> => {
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
    return ((data ?? [])[0] as Season | undefined) ?? null
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

    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const uid = auth.user?.id ?? ""

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
