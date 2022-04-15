/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { COMPILER_STACK_SIZE } from "../constants"

/**
 * A `CompileStack` keeps track of opened nodes destined to be eventually
 * closed. Any number of nodes can be open, and this is how parsing
 * actually creates a tree with depth.
 */
export class CompileStack {
  declare ids: Uint16Array
  declare positions: Uint32Array
  declare children: Uint16Array
  declare length: number

  constructor() {
    this.ids = new Uint16Array(COMPILER_STACK_SIZE)
    this.positions = new Uint32Array(COMPILER_STACK_SIZE)
    this.children = new Uint16Array(COMPILER_STACK_SIZE)
    this.length = 0
  }

  /** Add a child to every element. */
  increment() {
    for (let i = 0; i < this.length; i++) {
      this.children[i]++
    }
  }

  /**
   * Add a new element.
   *
   * @param id - The node type of the token.
   * @param start - The start position of the token.
   * @param children - The number of children the token will start with.
   */
  push(id: number, start: number, children: number) {
    this.ids[this.length] = id
    this.positions[this.length] = start
    this.children[this.length] = children
    this.length++
  }

  /** Remove and return the last element. */
  pop() {
    const id = this.ids[this.length - 1]
    const start = this.positions[this.length - 1]
    const children = this.children[this.length - 1]
    this.length--
    return [id, start, children]
  }

  /** Remove every element past the index given. */
  close(idx: number) {
    this.length = idx + 1
  }

  /** Returns the last element with the given ID. */
  last(id: number) {
    let last = -1
    for (let i = 0; i < this.length; i++) {
      if (this.ids[i] === id) last = i
    }
    if (last === -1) return null
    return last
  }
}
