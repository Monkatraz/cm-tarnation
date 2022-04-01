/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Input, NodeProp } from "@lezer/common"
import type { Regex } from "./grammar/definition"

export interface SearchOpts {
  /** Starting minimum index for the search. */
  min?: number
  /** Starting maximum index for the search. */
  max?: number
  /**
   * If true, the search will return the closest index to the desired value
   * on failure.
   */
  precise?: boolean
}

/**
 * Performs a binary search through an array.
 *
 * The comparator function should return -1 if undershooting the desired
 * value, +1 if overshooting, and 0 if the value was found.
 *
 * The comparator can also short-circuit the search by returning true or
 * false. Returning true is like returning a 0 (target found), but
 * returning false induces a null return.
 */
export function search<T, TR>(
  haystack: T[],
  target: TR,
  comparator: (element: T, target: TR) => number | boolean,
  { min = 0, max = haystack.length - 1, precise = true }: SearchOpts = {}
) {
  if (haystack.length === 0) return null

  let index = -1
  while (min <= max) {
    index = min + ((max - min) >>> 1)
    const cmp = comparator(haystack[index], target)
    if (cmp === true || cmp === 0) return { element: haystack[index], index }
    if (cmp === false) return null
    if (cmp < 0) min = index + 1
    else if (cmp > 0) max = index - 1
  }

  if (index === -1) return null

  if (!precise) return { element: null, index }

  return null
}

/** Class that implements the Lezer `Input` interface using a normal string. */
export class StringInput implements Input {
  constructor(readonly string: string) {}

  get length() {
    return this.string.length
  }

  chunk(from: number) {
    return this.string.slice(from)
  }

  readonly lineChunks = false

  read(from: number, to: number) {
    return this.string.slice(from, to)
  }
}

/**
 * Safely compiles a regular expression.
 *
 * @example
 *
 * ```ts
 * // returns null if features aren't supported (e.g. Safari)
 * const regex = re`/(?<=\d)\w+/d`
 * ```
 */
export function re(str: TemplateStringsArray | string, forceFlags = "") {
  const input = typeof str === "string" ? str : str.raw[0]
  const split = /^!?\/([^]+)\/([^]*)$/.exec(input)

  if (!split || !split[1]) return null

  let [, src = "", flags = ""] = split

  if (forceFlags) flags = dedupe([...flags, ...forceFlags]).join("")

  try {
    return new RegExp(src, flags)
  } catch (err) {
    console.warn("cm-tarnation: Recovered from failed RegExp construction")
    console.warn("cm-tarnation: RegExp source:", input)
    console.warn(err)
    return null
  }
}

/**
 * Tests if the given string is a "RegExp string", as in it's in the format
 * of a native `RegExp` statement.
 */
export function isRegExpString(str: string): str is Regex {
  const split = /^!?\/([^]+)\/([^]*)$/.exec(str)
  if (!split || !split[1]) return false
  return true
}

/** Returns if the given `RegExp` has any remembered capturing groups. */
export function hasCapturingGroups(regexp: RegExp) {
  // give an alternative that always matches
  const always = new RegExp(`|${regexp.source}`)
  // ... which means we can use it to get a successful match,
  // regardless of the original regex. this is a bit of a hack,
  // but we can use this to detect capturing groups.
  return always.exec("")!.length > 1
}

/**
 * Creates a lookbehind function from a `RegExp`. This function can only
 * test for a pattern's (non) existence, so no matches or capturing groups
 * are returned.
 *
 * @param pattern - A `RegExp` to be used as a pattern.
 * @param negative - Negates the pattern.
 */
export function createLookbehind(pattern: RegExp, negative?: boolean) {
  // can't be sticky, global, or multiline
  const flags = pattern.flags.replaceAll(/[ygm]/g, "")

  // regexp that can only match at the end of a string
  const regex = new RegExp(`(?:${pattern.source})$`, flags)

  return (str: string, pos: number) => {
    const clipped = str.slice(0, pos)
    const result = regex.test(clipped)
    return negative ? !result : result
  }
}

/**
 * A special per-node `NodeProp` used for describing nodes where a nested
 * parser will be embedded.
 */
export const EmbeddedParserProp = new NodeProp<string>()

/**
 * Returns a completely concatenated `Uint32Array` from a list of arrays.
 *
 * @param arrays - Arrays to concatenate.
 * @param length - If you know the length of the final array, you can pass
 *   it here to avoid having the function calculate it.
 */
export function concatUInt32Arrays(arrays: Uint32Array[], length?: number) {
  let total = length ?? 0

  if (!total) {
    for (let i = 0; i < arrays.length; i++) {
      total += arrays[i].length
    }
  }

  const result = new Uint32Array(total)

  let offset = 0
  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], offset)
    offset += arrays[i].length
  }

  return result
}

/**
 * Deduplicates an array. Does not mutate the original array.
 *
 * @param arr - The array to deduplicate.
 * @param insert - Additional values to insert into the array, if desired.
 */
export function dedupe<T extends any[]>(arr: T, ...insert: T) {
  return [...new Set([...arr, ...insert])] as T
}

/** Performance measuring utility. */
export function perfy(): () => number {
  const start = performance.now()
  return () => {
    return parseFloat((performance.now() - start).toFixed(4))
  }
}

/** Removes all properties assigned to `undefined` in an object. */
export function removeUndefined<T>(obj: T) {
  // this wacky approach is faster as it avoids an iterator
  const keys = Object.keys(obj) as (keyof T)[]
  for (let i = 0; i < keys.length; i++) {
    if (obj[keys[i]] === undefined) delete obj[keys[i]]
  }
  return obj as { [K in keyof T]: Exclude<T[K], undefined> }
}

/** Takes a string and escapes any `RegExp` sensitive characters. */
export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|\[\]\\]/g, "\\$&")
}

/** Creates a simple pseudo-random ID, with an optional prefix attached. */
export function createID(prefix = "") {
  const suffix = Math.abs(hash(Math.random() * 100 + prefix))
  return `${prefix}-${suffix}`
}

/** Converts a string into an array of codepoints. */
export function toPoints(str: string) {
  const codes: number[] = []
  for (let i = 0; i < str.length; i++) {
    codes.push(str.codePointAt(i)!)
  }
  return codes
}

/**
 * Checks an array of codepoints against a codepoint array or a string,
 * starting from a given position.
 */
export function pointsMatch(points: number[], str: string | number[], pos: number) {
  if (typeof str === "string") {
    for (let i = 0; i < points.length; i++) {
      if (points[i] !== str.codePointAt(pos + i)) return false
    }
  } else {
    for (let i = 0; i < points.length; i++) {
      if (points[i] !== str[pos + i]) return false
    }
  }
  return true
}

// https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0#gistcomment-2694461
/** Very quickly generates a (non-secure) hash from the given string. */
export function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}
