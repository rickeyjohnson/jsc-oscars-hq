import type { BallotDetail, Category, Nominee } from "../types"

const DAY = 86_400_000

export const nominee = (id: string, display_name: string, overrides: Partial<Nominee> = {}): Nominee => ({
    id,
    display_name,
    type: "person",
    member_ids: [],
    ...overrides,
})

export const category = (id: string, name: string, nominees: Nominee[], overrides: Partial<Category> = {}): Category => ({
    id,
    name,
    description: "",
    order: 0,
    nominee_mode: "preset",
    allow_member_add: false,
    nominees,
    ...overrides,
})

// Open ballot: opened yesterday, closes tomorrow.
export const ballot = (overrides: Partial<BallotDetail> = {}): BallotDetail => ({
    id: "B1",
    season_id: "S1",
    parent_ballot_id: null,
    name: "Fall Ballot",
    round: "main",
    status: "open",
    opens_at: new Date(Date.now() - DAY).toISOString(),
    closes_at: new Date(Date.now() + DAY).toISOString(),
    categories: [],
    ...overrides,
})

const NAMES = ["Ann", "Bo", "Cy", "Di", "Ed", "Flo", "Gus", "Hal", "Ivy", "Jo", "Kai", "Lou", "Mia", "Ned"]
export const MEMBERS = NAMES.map((name, i) => ({
    id: `m-${name}`,
    name,
    user_id: `u-${name}`,
    photo: `/sidechatters/${i + 1}.jpg`,
}))

export type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e?: unknown) => void }
export const deferred = <T = void>(): Deferred<T> => {
    let resolve!: (v: T) => void
    let reject!: (e?: unknown) => void
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}

export const memStorage = (): Storage => {
    const m = new Map<string, string>()
    return {
        get length() { return m.size },
        clear: () => m.clear(),
        getItem: (k) => m.get(k) ?? null,
        key: (i) => Array.from(m.keys())[i] ?? null,
        removeItem: (k) => { m.delete(k) },
        setItem: (k, v) => { m.set(k, String(v)) },
    }
}
