export type NomineeMode = "everyone" | "subset" | "preset" | "group"
export type NomineeType = "person" | "group" | "outsider" | "noun"
export type BallotStatus = "draft" | "open" | "closed" | "released"
export type BallotRound = "main" | "tiebreak" | "committee"
export type DecidedBy = "votes" | "tiebreak" | "committee_vote" | "manual"
export type Member = { id: string; name: string; user_id: string | null }
export type Season = { id: string; name: string; ceremony_at: string | null; location: string | null; results_released_at: string | null }
export type Ballot = { id: string; season_id: string; parent_ballot_id: string | null; name: string; round: BallotRound; status: BallotStatus; opens_at: string; closes_at: string; /** false = practice ballot: results show, but never count toward stats. Missing/true = counts. */ count_in_stats?: boolean }
export type Nominee = { id: string; display_name: string; secondary_text?: string; type: NomineeType; member_ids: string[] }
export type Category = { id: string; name: string; description: string; order: number; nominee_mode: NomineeMode; allow_member_add: boolean; /** Group mode: voters pick exactly this many people (2 to 8). Null on older categories = 2 or 3. */ group_size?: number | null; /** Members whose MYOC idea inspired this category (shown as "Idea from ..."). Empty or missing = a committee category. */ credit_member_ids?: string[]; nominees: Nominee[]; /** Set on drafts that came from accepted MYOC ideas (builder shows a MYOC tag). Never saved. */ source?: "myoc"; /** Set when a season is loaded for stats: false for categories of a practice ballot. */ in_stats?: boolean }
export type BallotFormData = { season_id: string; name: string; opens_at: string; closes_at: string; count_in_stats?: boolean; categories: Category[] }
export type BallotDetail = Ballot & { categories: Category[] }
export type VoteRow = { category_id: string; nominee_id: string; voter_id: string; updated_at: string }
export type Place = { nominee_id: string; slot: 1 | 2 | 3 | null; place: number; tied: boolean }
export type ResultRow = { category_id: string; decided_ballot_id: string; winner_nominee_id: string | null; nominee_ids: string[]; top3_nominee_ids: string[]; decided_by: DecidedBy | null; places?: Place[] | null }
