/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { NodeSet, Tree, TreeBuffer } from "@lezer/common"
import { CHUNK_ARRAY_INTERVAL } from "../constants"
import type { GrammarState } from "../grammar/state"
import type { ParserAction } from "../types"

/**
 * A syntactic chunk of a parsed document. The full syntax tree can be
 * constructed by stringing these chunks together in a list. They can also
 * be used to restart a parse from the chunk's starting position.
 */
export class Chunk {
  /** The starting position of the chunk. */
  declare from: number

  /** The ending position of the chunk. */
  declare to: number

  /** The length of the chunk, in characters. */
  declare length: number

  /**
   * The list of tokens this chunk is made up of. Note that each token is
   * made up of three elements in the array.
   */
  declare tokens: Int16Array

  /** The number of tokens in the chunk. */
  declare size: number

  /** The node(s) to open when this chunk starts. `null` if the chunk opens nothing. */
  declare open: ParserAction | null

  /** The node(s) to close when this chunk ends. `null` if the chunk closes nothing. */
  declare close: ParserAction | null

  /** The `GrammarState` at the start of this chunk. */
  declare state: GrammarState

  /**
   * {@link Tree} (or buffer) version of this chunk. If `null`, the tree
   * will not be available, ever, due to the shape of the chunk.
   */
  declare tree?: Tree | null

  /**
   * @param pos - The starting position.
   * @param state - The state at the starting position.
   */
  constructor(pos: number, state: GrammarState) {
    this.from = pos
    this.to = pos
    this.length = 0
    this.state = state
    this.tokens = new Int16Array(CHUNK_ARRAY_INTERVAL)
    this.size = 0
    this.open = null
    this.close = null
  }

  /**
   * Offsets the chunk's starting position.
   *
   * @param offset - The offset to add to the chunk's starting position.
   */
  offset(offset: number) {
    this.from += offset
    this.to = this.from + this.length
  }

  /**
   * Adds a new token to the chunk.
   *
   * @param id - The token ID.
   * @param from - The starting position of the token.
   * @param to - The ending position of the token.
   */
  add(id: number | null, from: number, to: number) {
    this.tree = undefined

    if (to > this.to) {
      this.to = to
      this.length = to - this.from
    }

    // make token relative to chunk position
    from -= this.from
    to -= this.from

    if (id !== null) {
      // resize token array if needed
      if (this.size * 3 + 3 > this.tokens.length) {
        const old = this.tokens
        this.tokens = new Int16Array(this.tokens.length + CHUNK_ARRAY_INTERVAL)
        this.tokens.set(old)
      }

      const idx = this.size * 3
      this.tokens[idx] = id
      this.tokens[idx + 1] = from
      this.tokens[idx + 2] = to
      this.size++
    }
  }

  /**
   * Adds a node to open when the chunk starts.
   *
   * @param ids - The node ID(s).
   */
  pushOpen(...ids: number[]) {
    this.tree = undefined
    this.open ??= []
    this.open.push(...ids)
  }

  /**
   * Adds a node to close when the chunk ends.
   *
   * @param ids - The node ID(s).
   */
  pushClose(...ids: number[]) {
    this.tree = undefined
    this.close ??= []
    this.close.push(...ids)
  }

  /** Checks if the chunk can be converted into a {@link Tree}. */
  private canConvertToTree() {
    if (this.tree === null) return false

    if (this.size <= 1) return false

    if (this.open || this.close) {
      if (!(this.open && this.close)) return false
      if (this.open.length !== this.close.length) return false
      const open = this.open.slice().reverse()
      const close = this.close
      for (let i = 0; i < open.length; i++) {
        if (open[i] !== close[i]) return false
      }
    }

    return true
  }

  /**
   * Tries to convert this chunk into a {@link Tree}. If that isn't
   * possible, this function will return `null` and cache the result. The
   * cache is invalidated if the chunk changes.
   *
   * @param nodeSet - The language node set to use when creating the tree.
   */
  tryForTree(nodeSet: NodeSet) {
    if (this.tree === null) return null
    if (this.tree) return this.tree

    if (!this.canConvertToTree()) {
      this.tree = null
      return null
    }

    const buffer: number[] = []

    const total = this.size * 4 + (this.open?.length ?? 0) * 4

    if (this.open) {
      for (let i = this.open.length - 1; i >= 0; i--) {
        buffer.push(this.open[i], 0, this.length, total)
      }
    }

    for (let i = 0; i < this.size; i++) {
      const idx = i * 3
      buffer.push(
        this.tokens[idx],
        this.tokens[idx + 1],
        this.tokens[idx + 2],
        buffer.length + 4
      )
    }

    const tree = new TreeBuffer(new Uint16Array(buffer), this.length, nodeSet)
    this.tree = tree as unknown as Tree

    return tree as unknown as Tree
  }

  /**
   * Determines if a grammar's state (and parse position) is compatible
   * with reusing this node. This is only a safe determination if it is
   * made _after_ the changed range of the document.
   *
   * @param state - The state to compare against.
   * @param pos - The position to compare against.
   * @param offset - The edit offset, to correct for chunk position differences.
   */
  isReusable(state: GrammarState, pos: number, offset = 0) {
    if (this.from + offset !== pos) return false
    if (!state.equals(this.state)) return false
    return true
  }
}
