export type PatchNote = { version: string; date: string; title: string; changes: string[] }

/** Newest first. Add an entry here whenever something ships; the newest one is the app's version. */
export const PATCH_NOTES: readonly PatchNote[] = [
    {
        version: "1.4.0",
        date: "Nov 26, 2026",
        title: "Ask Larry",
        changes: [
            "Meet Larry, the app's assistant: tap Ask Larry to ask how things work, get stats and deadlines, or just josh around.",
            "Larry only sees what you can already see, and results stay sealed until the reveal.",
            "Each member gets a limited number of questions a day.",
        ],
    },
    {
        version: "1.3.0",
        date: "Nov 24, 2026",
        title: "Your seasons",
        changes: [
            "Wrapped: swipe through a recap of any past season.",
            "New Home widgets: Trophy case, Your career and Lab records (turn them on in Customize Home).",
            "Make Your Own Categories: My ideas now shows only your own ideas.",
            "The bottom button bar now spans the full width.",
        ],
    },
    {
        version: "1.2.0",
        date: "Nov 23, 2026",
        title: "Labs",
        changes: [
            "Higher or lower, with a count-up reveal and a share button for your streak.",
            "Slot machine with a shareable jackpot.",
            "Trophy shelf: your wins on display, with names for your awards. Only you see it.",
            "Balls now uses the same ball pit as the opening page.",
        ],
    },
    {
        version: "1.1.0",
        date: "Nov 22, 2026",
        title: "Ballots and feedback",
        changes: [
            "Draft ballots: your work is saved as you build, with a Drafts tab on Manage ballots.",
            "Practice ballots that don't count toward stats.",
            "Per-category group sizes (duos, trios and more).",
            "Feedback: report a bug or share an idea from Settings.",
            "Voting shows Saved, Saving or Not saved above Back and Next.",
        ],
    },
    {
        version: "1.0.0",
        date: "Nov 21, 2026",
        title: "Launch",
        changes: ["Voting, results, the leaderboard, My stats and Make Your Own Categories."],
    },
]

export const APP_VERSION = PATCH_NOTES[0].version
