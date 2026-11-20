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

// Submit ballot screen exists (Task 15). Entry points show only for open ballots the member has voted in.
export const SUBMIT_ENABLED = true
