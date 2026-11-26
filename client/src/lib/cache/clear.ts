import { cacheClearAll, cacheClearScope } from "./store"
import { clearInflight } from "./dedup"
import { GLOBAL, userScope } from "./keys"
import { clearAllChats } from "../chat/history"

/** Sign-out / user change: drop everything derived from that user, plus in-flight reads. */
export function clearUserCache(uid: string | null | undefined): void {
    if (uid) cacheClearScope(userScope(uid))
    clearInflight()
}

/** Explicit SIGNED_OUT: wipe user scopes and the global scope. Never called for network-class auth errors. */
export function clearAll(): void {
    cacheClearAll()
    clearInflight()
    clearAllChats()
}

export const clearGlobal = (): void => cacheClearScope(GLOBAL)
