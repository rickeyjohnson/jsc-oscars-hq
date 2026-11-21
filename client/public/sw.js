/* JSC Oscars service worker. Deliberately minimal: app shell + static assets ONLY.
 *
 * It never touches anything cross-origin (Supabase REST/auth/storage are all on another origin),
 * never handles non-GET requests, and never caches /api or /auth paths. Votes and sessions are
 * therefore always live network calls.
 *
 * The version and precache list below are stamped at build time (see vite.config.ts), so each deploy
 * produces a byte-different sw.js and browsers detect the update. Updating is opt-in: the page asks
 * for SKIP_WAITING only when it is safe (never mid-vote; see src/lib/pwa.ts).
 */
const VERSION = "__BUILD_ID__"
const CACHE = "oscars-static-" + VERSION
const PRECACHE = __PRECACHE__ // becomes ["/", "/assets/index-xxxx.js", ...]
const STATIC_PREFIXES = ["/assets/", "/fonts/", "/icons/"]

self.addEventListener("install", (event) => {
    // No skipWaiting here: the new worker waits until the page says it is a safe moment.
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(PRECACHE))
            .catch(() => undefined), // a failed precache must not block install; runtime caching still works
    )
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys()
            await Promise.all(keys.filter((k) => k.startsWith("oscars-static-") && k !== CACHE).map((k) => caches.delete(k)))
            await self.clients.claim()
        })(),
    )
})

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
    const req = event.request
    if (req.method !== "GET") return
    const url = new URL(req.url)
    if (url.origin !== self.location.origin) return // Supabase and every other third party: untouched
    if (url.pathname === "/sw.js" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return

    if (req.mode === "navigate") {
        // Network first so a deploy is picked up immediately; the cached shell is only an offline fallback.
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone()
                        caches.open(CACHE).then((c) => c.put("/", copy))
                    }
                    return res
                })
                .catch(() => caches.match("/").then((hit) => hit || Response.error())),
        )
        return
    }

    if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
        // Hashed assets never change for a given URL: cache first. Fonts and icons are stable too.
        event.respondWith(
            caches.match(req).then(
                (hit) =>
                    hit ||
                    fetch(req).then((res) => {
                        if (res.ok) {
                            const copy = res.clone()
                            caches.open(CACHE).then((c) => c.put(req, copy))
                        }
                        return res
                    }),
            ),
        )
    }
})
