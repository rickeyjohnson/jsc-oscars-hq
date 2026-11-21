// Service worker registration and the "don't interrupt a vote" update policy.

/** Pages where a reload would lose in-progress vote state (the vote page and its submit step). */
export function isVoteRoute(pathname: string): boolean {
    return /^\/app\/ballots\/[^/]+(\/.*)?$/.test(pathname)
}

/** A waiting worker may take over only when the user is not on a vote route. */
export function canApplyUpdate(pathname: string): boolean {
    return !isVoteRoute(pathname)
}

export function registerServiceWorker(): void {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
    let reloadForUpdate = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        // First install also fires this (clients.claim); only reload when WE asked for the swap.
        if (reloadForUpdate && canApplyUpdate(location.pathname)) location.reload()
    })
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
                const tryApply = () => {
                    if (reg.waiting && navigator.serviceWorker.controller && canApplyUpdate(location.pathname)) {
                        reloadForUpdate = true
                        reg.waiting.postMessage({ type: "SKIP_WAITING" })
                    }
                }
                reg.addEventListener("updatefound", () => reg.installing?.addEventListener("statechange", tryApply))
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") void reg.update().catch(() => undefined)
                    else tryApply()
                })
                // Re-check periodically so an update held back by a vote route lands once the user navigates away.
                window.setInterval(tryApply, 15_000)
                tryApply()
            })
            .catch(() => undefined) // a failed registration only means no offline shell
    })
}
