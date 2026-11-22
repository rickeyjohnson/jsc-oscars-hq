import type { Ballot, Season } from "../../types"
import type { Member } from "../../types"
import type { VoteRow } from "../../types"
import { releaseChecks, type ReleaseCheck, type ReleaseStatus } from "../../lib/release"
import { completionByMember, type BallotSummary, type MemberCompletion } from "../../lib/voting"
import type { SeasonResults } from "../../api/results"

// The existing API functions, injected so the fetch plan is testable without a network.
export type HomeIO = {
    fetchCurrentSeason(): Promise<Season | null>
    fetchBallotSummaries(includeDrafts?: boolean): Promise<BallotSummary[]>
    fetchSeasonResults(seasonId: string): Promise<SeasonResults>
    fetchReleaseStatus(seasonId: string): Promise<ReleaseStatus>
    fetchAllVotes(ballotId: string): Promise<VoteRow[]>
    fetchMembers(): Promise<Member[]>
}

export type HomeData = {
    season: Season | null
    released: boolean
    summaries: BallotSummary[]
    results: SeasonResults | null // only after release
    // committee only (null for members):
    ballots: Ballot[] | null
    checks: ReleaseCheck[] | null
    // null when there is no open main ballot (or the fetch failed, see errors.completion)
    completion: { ballot: BallotSummary; members: MemberCompletion[] } | null
    // a failing widget fetch only blanks that widget; the base season/ballots fetch stays fatal
    errors: Partial<Record<"results" | "committee" | "completion", Error>>
}
const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)))

// Minimal fetching: members never touch committee data; nobody requests results before release.
export async function loadHomeData(isCommittee: boolean, io: HomeIO, now: Date): Promise<HomeData> {
    const [season, summaries] = await Promise.all([io.fetchCurrentSeason(), io.fetchBallotSummaries()])
    const released = Boolean(season?.results_released_at)
    const data: HomeData = { season, released, summaries, results: null, ballots: null, checks: null, completion: null, errors: {} }
    if (!season) return data
    const jobs: Promise<void>[] = []
    if (released) {
        jobs.push(io.fetchSeasonResults(season.id).then((r) => void (data.results = r), (e) => void (data.errors.results = asError(e))))
    }
    if (isCommittee) {
        // Release readiness only matters before release (attentionItems is empty afterwards).
        if (!released) {
            jobs.push(
                io.fetchReleaseStatus(season.id).then(
                    (s) => {
                        data.ballots = s.ballots
                        data.checks = releaseChecks(s, now).checks
                    },
                    (e) => void (data.errors.committee = asError(e)),
                ),
            )
        }
        const open = summaries.find((b) => b.round === "main" && b.status === "open" && new Date(b.closes_at).getTime() > now.getTime())
        if (open) {
            jobs.push(
                Promise.all([io.fetchAllVotes(open.id), io.fetchMembers()]).then(
                    ([votes, members]) => {
                        data.completion = { ballot: open, members: completionByMember(members, votes, open.category_count) }
                    },
                    (e) => void (data.errors.completion = asError(e)),
                ),
            )
        }
    }
    await Promise.all(jobs)
    return data
}

// First-paint snapshot (per user, display-only). It never holds committee data (ballots, checks, completion, errors),
// and results only when a fresh response said the season is released, so a sealed season can never leak into storage.
export const HOME_SNAPSHOT_KEY = "home:snapshot"
export const HOME_SNAPSHOT_MAX_MS = 24 * 3600_000
export type HomeSnapshot = Pick<HomeData, "season" | "released" | "summaries" | "results">

export function toHomeSnapshot(d: HomeData): HomeSnapshot | null {
    if (!d.season) return null
    const released = Boolean(d.season.results_released_at)
    return { season: d.season, released, summaries: d.summaries, results: released ? d.results : null }
}

export const fromHomeSnapshot = (s: HomeSnapshot): HomeData => ({
    season: s.season,
    released: s.released,
    summaries: s.summaries,
    results: s.released ? s.results : null,
    ballots: null,
    checks: null,
    completion: null,
    errors: {},
})
