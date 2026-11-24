/** Slot machine for member photos. No money, no bets: just spins and jackpots. */

export type Outcome = "jackpot" | "pair" | "miss"

export const JACKPOT_ODDS = 0.08
export const PAIR_ODDS = 0.27

/** Three reel faces (indexes into `count` members). The odds are weighted so a jackpot is a treat, not a 1-in-196 myth. */
export function spinReels(r: () => number, count: number): [number, number, number] {
    const n = Math.max(1, count)
    const at = () => Math.floor(r() * n)
    const roll = r()
    if (roll < JACKPOT_ODDS) {
        const a = at()
        return [a, a, a]
    }
    if (roll < JACKPOT_ODDS + PAIR_ODDS && n > 1) {
        const a = at()
        let b = at()
        while (b === a) b = at()
        const spots: [number, number, number][] = [[a, a, b], [a, b, a], [b, a, a]]
        return spots[Math.floor(r() * 3)]
    }
    if (n < 3) return [at(), at(), at()]
    // a clean miss: three different faces
    const a = at()
    let b = at()
    while (b === a) b = at()
    let c = at()
    while (c === a || c === b) c = at()
    return [a, b, c]
}

export const outcomeOf = (reels: readonly number[]): Outcome => {
    const [a, b, c] = reels
    return a === b && b === c ? "jackpot" : a === b || b === c || a === c ? "pair" : "miss"
}

export const MISS_LINES = ["Nothing. Pull again.", "So close to something.", "The machine is thinking.", "Not today, champ.", "Three strangers walk into a bar."]
export const PAIR_LINES = ["A pair! The universe is warming up.", "Two of a kind. The third is shy.", "Almost. Do it again."]

/** The text copied after a jackpot: short enough for a group chat. */
export const jackpotShare = (name: string, spins: number, jackpots: number, url: string): string =>
    `JSC Oscars Slot Machine\n🎰 JACKPOT! ${name} x3\n${spins} ${spins === 1 ? "spin" : "spins"}, ${jackpots} ${jackpots === 1 ? "jackpot" : "jackpots"}\n${url}`
