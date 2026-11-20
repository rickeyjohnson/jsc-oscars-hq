export type ResultsTab = "winners" | "leaderboard"

export function parseResultsTab(search: string): ResultsTab {
    return new URLSearchParams(search).get("view") === "leaderboard" ? "leaderboard" : "winners"
}
