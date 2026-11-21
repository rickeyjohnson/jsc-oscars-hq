// Ballot submission = a confirmation only; votes stay editable until the ballot closes.
// FUTURE (Task 20, deferrable): persist in a ballot_submissions table so the committee can see who submitted;
// swap `submissionIO` to a DB-backed implementation. Until then the state is per device (localStorage).
export type SubmissionIO = { get(ballotId: string): Promise<string | null>; submit(ballotId: string): Promise<string> }

export const submissionKey = (ballotId: string, userId: string) => `jsc.submitted.v1.${ballotId}.${userId}`

export function localSubmissionIO(storage: Storage | null, userId: string, now: () => Date): SubmissionIO {
    return {
        async get(ballotId) {
            try {
                return storage?.getItem(submissionKey(ballotId, userId)) ?? null
            } catch {
                return null
            }
        },
        async submit(ballotId) {
            const at = now().toISOString()
            try {
                storage?.setItem(submissionKey(ballotId, userId), at)
            } catch {
                // storage unavailable: the confirmation still shows for this visit
            }
            return at
        },
    }
}

const browserStorage = (): Storage | null => {
    try {
        return typeof localStorage === "undefined" ? null : localStorage
    } catch {
        return null
    }
}

export let submissionIO: (userId: string) => SubmissionIO = (userId) => localSubmissionIO(browserStorage(), userId, () => new Date())

/** Synchronous read for screens that only need to know whether this device already submitted. */
export const submittedHere = (ballotId: string, userId: string): boolean => {
    try {
        return Boolean(browserStorage()?.getItem(submissionKey(ballotId, userId)))
    } catch {
        return false
    }
}
