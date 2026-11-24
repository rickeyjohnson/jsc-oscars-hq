import type { BallotFormData } from "../types"
import { formKey } from "./draftForm"

/** Work in progress in the ballot builder, kept on this device so closing the page loses nothing. One slot per user and per draft ("new" for an unsaved ballot). */
export type Autosaved = { form: BallotFormData; savedAt: string }

const keyFor = (userId: string, slot: string): string => `jsc.builderAutosave.${userId}.${slot}`

export const hasWork = (f: BallotFormData): boolean => Boolean(f.name.trim() || f.categories.length > 0)

export function readAutosave(storage: Storage | null, userId: string, slot: string): Autosaved | null {
    if (!storage || !userId) return null
    try {
        const raw = storage.getItem(keyFor(userId, slot))
        if (!raw) return null
        const v = JSON.parse(raw) as Autosaved
        return v && v.form && Array.isArray(v.form.categories) && typeof v.savedAt === "string" ? v : null
    } catch {
        return null
    }
}

export function writeAutosave(storage: Storage | null, userId: string, slot: string, form: BallotFormData, now: Date = new Date()): void {
    if (!storage || !userId) return
    try {
        if (!hasWork(form)) storage.removeItem(keyFor(userId, slot))
        else storage.setItem(keyFor(userId, slot), JSON.stringify({ form, savedAt: now.toISOString() } satisfies Autosaved))
    } catch {
        // storage full or unavailable: autosave is a convenience, saving the draft still works
    }
}

export function clearAutosave(storage: Storage | null, userId: string, slot: string): void {
    if (!storage || !userId) return
    try {
        storage.removeItem(keyFor(userId, slot))
    } catch {
        // ignore
    }
}

/** Offer a restore only when the stored copy actually differs from what is on screen / saved. */
export const worthRestoring = (stored: Autosaved | null, current: BallotFormData): stored is Autosaved => stored !== null && hasWork(stored.form) && formKey(stored.form) !== formKey(current)
