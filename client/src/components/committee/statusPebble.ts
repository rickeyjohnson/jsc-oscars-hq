import { STATUS_PEBBLE } from "../../ui/logic/pebble"
import type { PebbleName } from "../../ui/tokens"
import type { ChipStatus } from "../../lib/voting"

// "ended" (open but past its close time) reads like closed.
const key = (s: ChipStatus) => (s === "ended" ? "closed" : s)

// The pebble a status maps to; statuses without one (draft, closed) are null.
export const statusPebble = (s: ChipStatus): PebbleName | null => STATUS_PEBBLE[key(s)]
