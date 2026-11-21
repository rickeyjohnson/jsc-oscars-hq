import { PEBBLE_COLORS } from "../tokens"
import { pebbleFor } from "./pebble"

/** Photo n is /sidechatters/n.jpg; no member mapping exists for the files, so the filename key drives the (stable) ring color. */
export const ballKey = (index: number): string => `sidechatter-${index + 1}`
export const ballRingColor = (index: number): string => PEBBLE_COLORS[pebbleFor(ballKey(index))].bg

export const BALL_RADIUS_MIN = 32
export const BALL_RADIUS_MAX = 46

/** Radius varies per photo (32 to 46) but is a pure function of the index, so it is stable across renders and layouts. */
export const ballRadius = (index: number): number => BALL_RADIUS_MIN + ((index * 5 + 3) % 8) * 2
