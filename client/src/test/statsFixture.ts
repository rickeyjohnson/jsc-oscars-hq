// The real transcribed past stats (noms/wins per member), Fall 23 to Spring 26, for stats tests.
import type { PastStatRow } from "../lib/pastStats"

export const STAT_NAMES = ["Anthony", "Dakarai", "Demichael", "Micah", "Rico", "Nick", "Rickey", "Kadin", "Langston", "Jonathan", "John Sampson", "Evan", "TJ", "Justin"]
export const STAT_MEMBERS = STAT_NAMES.map((name) => ({ id: `m-${name}`, name, user_id: null as string | null }))
export const SEMESTERS = ["Fall 23", "Spring 24", "Fall 24", "Spring 25", "Fall 25", "Spring 26"]
// "Name:noms/wins"
const RAW = [
    "Anthony:8/1,Dakarai:16/5,Evan:7/3,Jonathan:10/5,Justin:5/1,Kadin:4/1,Langston:4/2,Micah:6/2,Nick:4/3,Rickey:12/4,TJ:2/1",
    "Anthony:9/4,Dakarai:17/4,Evan:12/4,Jonathan:12/2,John Sampson:3/2,Justin:9/4,Kadin:7/3,Langston:8/2,Micah:14/4,Nick:8/4,Rickey:9/4,TJ:8/4",
    "Anthony:5/2,Dakarai:4/1,Evan:4/1,John Sampson:5/3,Jonathan:8/4,Justin:3/1,Kadin:3/1,Langston:7/2,Micah:13/4,Nick:3/1,Rickey:10/5,TJ:2/0",
    "Micah:20/6,John Sampson:19/7,Anthony:13/6,Rickey:20/4,Justin:6/3,Dakarai:14/4,TJ:9/2,Jonathan:13/2,Evan:14/3,Kadin:10/2,Langston:15/2,Nick:4/0",
    "Anthony:17/3,Dakarai:21/8,Demichael:16/4,Evan:11/1,John Sampson:18/6,Jonathan:16/4,Justin:6/1,Kadin:16/4,Langston:10/1,Micah:19/6,Nick:5/1,Rickey:16/3,TJ:7/2",
    "Anthony:11/1,Dakarai:14/3,Demichael:16/8,Evan:11/1,John Sampson:10/2,Jonathan:10/2,Justin:5/1,Kadin:11/1,Langston:10/2,Micah:10/2,Nick:6/2,Rickey:12/4,TJ:10/6",
]
export const STAT_ROWS: PastStatRow[] = RAW.flatMap((line, i) =>
    line.split(",").map((x) => {
        const [name, v] = x.split(":")
        const [noms, wins] = v.split("/").map(Number)
        return { season_label: SEMESTERS[i], season_order: i, member_id: `m-${name}`, noms, wins }
    }),
)
