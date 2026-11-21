import { WIDGETS, type WidgetId } from "./homeWidgets"

export type HomePrefs = { version: 1; order: WidgetId[]; hidden: WidgetId[] }

export const homePrefsKey = (userId: string) => `jsc.home.v1.${userId}`

const KNOWN = new Set<string>(WIDGETS.map((w) => w.id))
const isId = (x: unknown): x is WidgetId => typeof x === "string" && KNOWN.has(x)
const isDefault = (id: WidgetId, isCommittee: boolean) => {
    const w = WIDGETS.find((d) => d.id === id)
    return Boolean(w && (isCommittee ? w.defaultCommittee : w.defaultMember))
}

export function defaultPrefs(isCommittee: boolean): HomePrefs {
    const order = WIDGETS.map((w) => w.id)
    return { version: 1, order, hidden: order.filter((id) => !isDefault(id, isCommittee)) }
}

const uniq = (ids: unknown): WidgetId[] => [...new Set(Array.isArray(ids) ? ids.filter(isId) : [])]

// Anything invalid or from another version becomes the default. Unknown ids are dropped; ids missing
// from `order` (e.g. widgets added later) are appended, hidden unless they are a default for this role.
export function normalizePrefs(raw: unknown, isCommittee: boolean): HomePrefs {
    if (!raw || typeof raw !== "object") return defaultPrefs(isCommittee)
    const r = raw as { version?: unknown; order?: unknown; hidden?: unknown }
    if (r.version !== 1 || !Array.isArray(r.order)) return defaultPrefs(isCommittee)
    const order = uniq(r.order)
    const hidden = uniq(r.hidden)
    for (const w of WIDGETS) {
        if (order.includes(w.id)) continue
        order.push(w.id)
        if (!isDefault(w.id, isCommittee) && !hidden.includes(w.id)) hidden.push(w.id)
    }
    return { version: 1, order, hidden }
}

export function loadHomePrefs(storage: Pick<Storage, "getItem"> | null, userId: string, isCommittee: boolean): HomePrefs {
    try {
        const text = storage?.getItem(homePrefsKey(userId))
        if (!text) return defaultPrefs(isCommittee)
        return normalizePrefs(JSON.parse(text), isCommittee)
    } catch {
        return defaultPrefs(isCommittee)
    }
}

// FUTURE (not in this plan): also persist prefs in a profiles.home_prefs jsonb column so they follow the
// user across devices; loadHomePrefs would stay the local fallback. No DB change is made here.
export function saveHomePrefs(storage: Pick<Storage, "setItem"> | null, userId: string, prefs: HomePrefs): void {
    try {
        storage?.setItem(homePrefsKey(userId), JSON.stringify(prefs))
    } catch {
        // storage unavailable or full: the preference simply is not remembered
    }
}

export function moveWidget(p: HomePrefs, id: WidgetId, dir: -1 | 1): HomePrefs {
    const i = p.order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= p.order.length) return p
    const order = [...p.order]
    ;[order[i], order[j]] = [order[j], order[i]]
    return { ...p, order }
}

export function toggleWidget(p: HomePrefs, id: WidgetId, on: boolean): HomePrefs {
    const rest = p.hidden.filter((h) => h !== id)
    return { ...p, hidden: on ? rest : [...rest, id] }
}
