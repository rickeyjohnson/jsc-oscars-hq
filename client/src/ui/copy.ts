export const COPY = {
    retry: "Try again",
    logIn: "Log in",
    logOut: "Log out",
    createAccount: "Create account",
    cancel: "Cancel",
    save: "Save",
    done: "Done",
    close: "Close",
    loading: "Loading…",
    selected: "Selected",
    taken: "Taken",
    loadFailed: (what: string) => `Couldn't load ${what}. Check your connection and try again.`,
    somethingWrong: "Something went wrong",
} as const

// Flipped on by Task 15 when /app/ballots/:id/submit exists.
export const SUBMIT_ENABLED = false
