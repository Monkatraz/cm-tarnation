/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { BufferCursor } from "@lezer/common"
import { FINISH_INCOMPLETE_NODES, NodeID } from "../constants"
import { concatUInt32Arrays } from "../util"
import type { Chunk } from "./chunk"

/** Stack used by the parser to track tree construction. */
export type ParseElementStack = [id: number, start: number, children: number][]

/**
 * A `ParseStack` keeps track of opened nodes destined to be eventually
 * closed. Any number of nodes can be open, and this is how parsing
 * actually creates a tree with depth.
 */
export class ParseStack {
  /** The actual array stack. */
  declare stack: ParseElementStack

  /** @param stack - The stack to use as the starting state, which will be cloned. */
  constructor(stack?: ParseElementStack) {
    if (!stack || !stack.length) {
      this.stack = []
    } else {
      // hyper-optimized cloning, as this is very much in the hot path
      const clone = new Array(stack.length)
      for (let i = 0; i < stack.length; i++) {
        clone[i] = [stack[i][0], stack[i][1], stack[i][2]]
      }
      this.stack = clone
    }
  }

  /**
   * Parses a {@link Chunk}, returning the parsed out {@link LezerToken}s.
   * Mutates this {@link ParseStack}, and caches the resultant tokens and
   * stack into the {@link Chunk} as well.
   *
   * @param chunk - The chunk to parse.
   */
  parse(chunk: Chunk) {
    const buffers: Uint32Array[] = []
    const tokens = chunk.tokens

    for (let idx = 0; idx < tokens.length; idx++) {
      const t = tokens[idx].read(chunk.pos)

      // avoiding destructuring here

      const type = t[0]
      const from = t[1]
      const to = t[2]
      const open = t[3]
      const close = t[4]

      // add open nodes to stack
      // this doesn't affect the buffer at all, but now we can watch for
      // when another node closes one of the open nodes we added
      if (open) {
        for (let i = 0; i < open.length; i++) {
          this.push(open[i], from, 0)
        }
      }

      // we don't want to push the actual token twice
      let pushed = false

      // pop close nodes from the stack, if they can be paired with an open node
      if (close) {
        for (let i = 0; i < close.length; i++) {
          const id = close[i]
          const idx = this.last(id)

          if (idx !== null) {
            // cut off anything past the closing element
            // i.e. inside nodes won't persist outside their parent if they
            // never closed before their parent did
            this.close(idx)

            // we need to push the token early
            if (type && !pushed) {
              buffers.push(arrtoken(type, from, to, 4))
              this.increment()
              pushed = true
            }

            // finally pop the node
            const s = this.pop()!
            const node = s[0]
            const pos = s[1]
            const children = s[2]

            buffers.push(arrtoken(node, pos, to, children * 4 + 4))
            this.increment()
          }
        }
      }

      // push the actual token to the buffer, if it hasn't been already
      if (type && !pushed) {
        buffers.push(arrtoken(type, from, to, 4))
        this.increment()
      }
    }

    const result = concatUInt32Arrays(buffers)

    // cache result
    chunk.parsed = { tokens: result.buffer, stack: this.clone() }

    return result.buffer
  }

  /** Add a child to every element. */
  increment() {
    for (let idx = 0; idx < this.stack.length; idx++) {
      this.stack[idx][2]++
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
    this.stack.push([id, start, children])
  }

  /** Remove and return the last element. */
  pop() {
    return this.stack.pop()
  }

  /** Remove every element past the index given. */
  close(idx: number) {
    this.stack = this.stack.slice(0, idx + 1)
  }

  /** Returns the last element with the given ID. */
  last(id: number) {
    let last = -1
    for (let idx = 0; idx < this.stack.length; idx++) {
      const elementID = this.stack[idx][0]
      if (elementID === id) last = idx
    }
    if (last === -1) return null
    return last
  }

  /** Returns a clone of this stack. */
  clone() {
    return new ParseStack(this.stack)
  }
}

/** Utility function needed because apparently `TypedArray.of` isn't in every browser. */
function arrtoken(type: number, from: number, to: number, children: number) {
  const arr = new Uint32Array(4)
  arr[0] = type
  arr[1] = from
  arr[2] = to
  arr[3] = children
  return arr
}

/**
 * Compiles, and if needed, parses, a list of {@link Chunk}s. Returns a
 * `Tree.build` compatible buffer and a list of "reused" trees for language nesting.
 *
 * @param chunks - The chunks to compile.
 * @param end - The length of the document.
 */
export function compileChunks(chunks: Chunk[], end: number) {
  if (!chunks.length) return new ArrayBufferCursor(new Uint32Array(0), 0)

  const chunkBuffers: Uint32Array[] = []

  let stack = new ParseStack()
  let shouldCloneStack = false
  let length = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    let tokens: ArrayBuffer

    // reuse chunk
    if (chunk.parsed) {
      tokens = chunk.parsed.tokens
      stack = chunk.parsed.stack
      shouldCloneStack = true
    }
    // parse chunk
    else {
      if (shouldCloneStack) stack = stack.clone()
      tokens = stack.parse(chunk)
      shouldCloneStack = false
    }

    const buffer = new Uint32Array(tokens)
    length += buffer.length
    chunkBuffers.push(buffer)
  }

  if (FINISH_INCOMPLETE_NODES) {
    if (shouldCloneStack) stack = stack.clone()
    while (stack.stack.length) {
      // emit an error token
      chunkBuffers.push(arrtoken(NodeID.ERROR, end, end, 4))
      stack.increment()

      // finish the last element in the stack
      const s = stack.pop()!
      const node = s[0]
      const pos = s[1]
      const children = s[2]

      chunkBuffers.push(arrtoken(node, pos, end, children * 4 + 4))
      stack.increment()

      length += 8
    }
  }

  const buffer = concatUInt32Arrays(chunkBuffers, length)
  const cursor = new ArrayBufferCursor(buffer, buffer.length)
  return cursor
}

// prettier-ignore
/** Cursor that the `Tree.buildData` function uses to read a buffer. */
class ArrayBufferCursor implements BufferCursor {
  constructor(readonly buffer: Uint32Array, public pos: number) {}

  // weirdly enough, using getters here is _faster_.
  // I don't understand why, lol

  get id()    { return this.buffer[this.pos - 4] }
  get start() { return this.buffer[this.pos - 3] }
  get end()   { return this.buffer[this.pos - 2] }
  get size()  { return this.buffer[this.pos - 1] }

  next() { this.pos -= 4 }
  fork() { return new ArrayBufferCursor(this.buffer, this.pos) }
}
