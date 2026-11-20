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
    completion: { ballot: BallotSummary; members: MemberCompletion[] } | null
}

// Minimal fetching: members never touch committee data; nobody requests results before release.
export async function loadHomeData(isCommittee: boolean, io: HomeIO, now: Date): Promise<HomeData> {
    const [season, summaries] = await Promise.all([io.fetchCurrentSeason(), io.fetchBallotSummaries()])
    const released = Boolean(season?.results_released_at)
    const data: HomeData = { season, released, summaries, results: null, ballots: null, checks: null, completion: null }
    if (!season) return data
    const jobs: Promise<void>[] = []
    if (released) {
        jobs.push(io.fetchSeasonResults(season.id).then((r) => void (data.results = r)))
    }
    if (isCommittee) {
        jobs.push(
            io.fetchReleaseStatus(season.id).then((s) => {
                data.ballots = s.ballots
                data.checks = releaseChecks(s, now).checks
            }),
        )
        const open = summaries.find((b) => b.round === "main" && b.status === "open" && new Date(b.closes_at).getTime() > now.getTime())
        if (open) {
            jobs.push(
                Promise.all([io.fetchAllVotes(open.id), io.fetchMembers()]).then(([votes, members]) => {
                    data.completion = { ballot: open, members: completionByMember(members, votes, open.category_count) }
                }),
            )
        }
    }
    await Promise.all(jobs)
    return data
}
