import { PEBBLE_COLORS } from "../tokens"
import { pebbleFor } from "./pebble"

/** Photo n is /sidechatters/n.jpg; no member mapping exists for the files, so the filename key drives the (stable) ring color. */
export const ballKey = (index: number): string => `sidechatter-${index + 1}`
export const ballRingColor = (index: number): string => PEBBLE_COLORS[pebbleFor(ballKey(index))].bg
