export class TimeoutError extends Error {
    constructor(ms: number) {
        super(`Request timed out after ${Math.round(ms / 1000)}s`)
        this.name = "TimeoutError"
    }
}

export const REQUEST_TIMEOUT_MS = 15_000

// Fails a request that hangs (cold database, bad signal) so the screen can show its retry path instead of spinning.
export function withTimeout<T>(p: PromiseLike<T>, ms: number = REQUEST_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new TimeoutError(ms)), ms)
        Promise.resolve(p).then(
            (v) => {
                clearTimeout(t)
                resolve(v)
            },
            (e) => {
                clearTimeout(t)
                reject(e)
            },
        )
    })
}
