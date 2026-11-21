// Scopes: "g" (global: identical for every signed-in member) or "u.<uid>" (anything RLS-filtered per user).
// See docs/superpowers/plans/2026-11-24-caching.md section 3 for what must NEVER be cached
// (votes, ballot open/close, results gate, is_committee, auth, tallies, drafts).
export const GLOBAL = "g"
export const userScope = (uid: string): string => `u.${uid}`
export const PREFIX = "jsc.cache."
export const CACHE_VERSION = 1
