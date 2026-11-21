// The registry of contextual feature intros. Each is shown once per member per device on the first visit to its screen.
export type IntroCard = { title: string; body?: string[]; points?: string[] }
/** What the host knows about the screen: the path, the ?tab= value, and the topic the page reports once it is ready (null until then). */
export type IntroRoute = { path: string; tab: string | null; topic: string | null }
export type IntroDef = { id: string; title: string; audience: "member" | "committee"; cards: IntroCard[]; match: (r: IntroRoute) => boolean }

const is = (p: string) => (r: IntroRoute) => r.path === p
const BALLOT_DETAIL = /^\/app\/ballots\/[^/]+$/
const ADMIN_DETAIL = /^\/app\/profile\/ballots\/(?!create$)[^/]+$/

export const INTROS: IntroDef[] = [
    {
        id: "voting",
        title: "Voting",
        audience: "member",
        match: (r) => BALLOT_DETAIL.test(r.path) && r.topic === "vote",
        cards: [
            { title: "One category at a time", body: ["Each page is one category. Tap a nominee to vote. Your vote saves right away."] },
            { title: "Groups and you", points: ["Some nominees are groups.", "You can't vote for yourself or a group you're in."] },
            { title: "Skip, jump, review", points: ["Not sure? Tap Skip and come back.", "Use Jump to go to any category.", "Tap Review at the end to check your picks."] },
            { title: "Change your mind", body: ["Tap another nominee to change your vote, or tap Clear my vote to take it back. You can change votes until the ballot closes."] },
        ],
    },
    {
        id: "ballots",
        title: "Ballots",
        audience: "member",
        match: is("/app/ballots"),
        cards: [
            { title: "Find your ballots", points: ["Open: you can vote now, or it opens soon.", "Voted: you've picked something in every category.", "Closed: voting is over."] },
            { title: "Keep going", body: ["Tap a ballot to vote. Come back any time before it closes to change a vote."] },
        ],
    },
    {
        id: "home",
        title: "Home",
        audience: "member",
        match: is("/app"),
        cards: [
            { title: "Your Home", body: ["Widgets show the ceremony, your ballots and your progress. Tap one to jump in."] },
            { title: "Make it yours", points: ["Tap the sliders icon at the top to customize Home.", "Turn widgets on or off.", "Reorder with the drag handles, or use Move up and Move down."] },
        ],
    },
    {
        id: "results",
        title: "Results",
        audience: "member",
        match: is("/app/results"),
        cards: [
            { title: "Sealed until the reveal", body: ["The committee reveals the winners on ceremony night. Until then this page stays sealed."] },
            { title: "After the reveal", points: ["Each category shows its podium.", "The leaderboard ranks everyone by wins.", "Tap Previous to see past Oscars."] },
        ],
    },
    {
        id: "you",
        title: "You and Settings",
        audience: "member",
        match: is("/app/profile"),
        cards: [
            { title: "Your numbers", body: ["Your stats show your nominations and wins. Wins appear after the reveal.", "Once past semesters are added, All time totals include them."] },
            { title: "More to explore", points: ["Previous Oscars: stats from past semesters.", "Settings: reduce motion, add Oscar night to your calendar, and replay these tips under How it works."] },
        ],
    },
    {
        id: "myoc",
        title: "MYOC",
        audience: "member",
        match: (r) => r.path === "/app/profile/settings/myoc" && r.tab !== "review" && r.tab !== "window",
        cards: [
            { title: "Suggest categories", body: ["Have an idea for a category? Send as many as you like while MYOC is open."] },
            { title: "Your ideas are private", body: ["Other members can't see your ideas. Only the committee reads them."] },
            { title: "What happens next", body: ["The committee reviews every idea and builds the next ballot from the ones they accept. You can edit or withdraw an idea until MYOC closes."] },
        ],
    },
    {
        id: "previous",
        title: "Previous Oscars",
        audience: "member",
        match: is("/app/results/previous"),
        cards: [
            { title: "How stats are counted", points: ["Stats count nominations: the top 3 in votes in each category.", "Ties count too, even if only one name was shown on screen.", "Group votes count toward wins and nominations."] },
            { title: "Pick a semester", body: ["Choose All time or one semester to see its leaderboard.", "Live-voting categories aren't included."] },
        ],
    },
    {
        id: "manage-ballots",
        title: "Manage ballots",
        audience: "committee",
        match: (r) => r.path === "/app/profile/ballots" || (ADMIN_DETAIL.test(r.path) && r.topic === "main"),
        cards: [
            { title: "Start at Next", body: ["Every ballot shows one Next card. It tells you what to do now, with one main button."] },
            { title: "See who voted", body: ["Check who has voted and who hasn't, so you know who to nudge."] },
            { title: "Close and reopen", body: ["Close a ballot when voting is done. Results record automatically when it closes.", "Need more time? Reopen it with a new closing time."] },
        ],
    },
    {
        id: "builder",
        title: "Build a ballot",
        audience: "committee",
        match: is("/app/profile/ballots/create"),
        cards: [
            { title: "Three steps", body: ["Details, Categories, then Review. Review lists anything you still need to fix."] },
            { title: "Add categories fast", body: ["Tap Import to add many categories at once. Accepted MYOC ideas can arrive here as ready-made categories."] },
        ],
    },
    {
        id: "rounds",
        title: "Tiebreak and committee rounds",
        audience: "committee",
        match: (r) => ADMIN_DETAIL.test(r.path) && r.topic === "round",
        cards: [
            { title: "When votes tie", body: ["If the top spots tie, start a tiebreak round and set when it closes."] },
            { title: "Committee round", body: ["If a tie is still open, the committee picks. Enter the winner for each category. The round closes itself when every winner is in. Members see nothing until the reveal."] },
        ],
    },
    {
        id: "reveal",
        title: "The envelope",
        audience: "committee",
        match: (r) => r.path === "/app/profile/release" && r.topic === "ready",
        cards: [
            { title: "Check first", body: ["The list shows what's ready. Anything not ready locks the reveal until you fix it."] },
            { title: "Hold to reveal", body: ["Press and hold for 3 seconds. Every member sees every winner. This can't be undone."] },
        ],
    },
    {
        id: "myoc-review",
        title: "Review MYOC ideas",
        audience: "committee",
        match: (r) => r.path === "/app/profile/settings/myoc" && r.tab === "review",
        cards: [
            { title: "Read the ideas", body: ["Tap an idea to read it, see who sent it, and edit the wording."] },
            { title: "Decide", body: ["Accept it, reject it, or merge duplicates into one idea."] },
            { title: "Build the ballot", body: ["Tap Build ballot to send the accepted ideas to the ballot builder."] },
        ],
    },
    {
        id: "ceremony",
        title: "Ceremony date",
        audience: "committee",
        match: is("/app/profile"),
        cards: [
            { title: "Set the date", body: ["Tap Season and ceremony date to set when and where Oscar night happens. Times are Eastern."] },
            { title: "Everyone sees it", body: ["It shows on Home and in the countdown. Members can add it to their calendar from Settings."] },
        ],
    },
]

export const introsFor = (committee: boolean): IntroDef[] => INTROS.filter((i) => i.audience === "member" || committee)

export const introKey = (userId: string, id: string) => `jsc.intro.v1.${userId}.${id}`

export function hasSeenIntro(storage: Pick<Storage, "getItem"> | null, userId: string, id: string): boolean {
    try {
        return storage?.getItem(introKey(userId, id)) === "1"
    } catch {
        return false
    }
}

export function markIntroSeen(storage: Pick<Storage, "setItem"> | null, userId: string, id: string): void {
    try {
        storage?.setItem(introKey(userId, id), "1")
    } catch {
        /* storage unavailable: the intro may show again, which is harmless */
    }
}

/** "Show all tips again": clears every intro flag for this user (committee ones too, so they come back if the role changes). */
export function resetIntros(storage: Pick<Storage, "removeItem"> | null, userId: string): void {
    for (const i of INTROS) {
        try {
            storage?.removeItem(introKey(userId, i.id))
        } catch {
            /* ignore */
        }
    }
}

export const INTROS_RESET_EVENT = "jsc:intros-reset"
