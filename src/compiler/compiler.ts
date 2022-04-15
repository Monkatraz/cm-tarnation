/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BufferCursor, Tree } from "@lezer/common"
import { COMPILER_ARRAY_INTERVAL, FINISH_INCOMPLETE_NODES, NodeID } from "../constants"
import type { TarnationLanguage } from "../language"
import { ChunkBuffer } from "./buffer"
import type { Chunk } from "./chunk"
import { CompileStack } from "./stack"

export class Compiler {
  declare language: TarnationLanguage
  declare stack: CompileStack
  declare buffer: ChunkBuffer
  declare compiled: Int32Array
  declare size: number
  declare reused: Tree[]
  declare index: number

  constructor(language: TarnationLanguage, buffer?: ChunkBuffer) {
    this.language = language
    this.stack = new CompileStack()
    this.buffer = buffer || new ChunkBuffer()
    this.compiled = new Int32Array(COMPILER_ARRAY_INTERVAL)
    this.size = 0
    this.reused = []
    this.index = 0
  }

  get done() {
    return this.index >= this.buffer.chunks.length
  }

  private emit(type: number, from: number, to: number, children: number) {
    const idx = this.size * 4

    // we may need to resize the array
    if (idx + 4 > this.compiled.length) {
      const old = this.compiled
      this.compiled = new Int32Array(old.length + COMPILER_ARRAY_INTERVAL)
      this.compiled.set(old)
    }

    this.compiled[idx] = type
    this.compiled[idx + 1] = from
    this.compiled[idx + 2] = to
    this.compiled[idx + 3] = children
    this.size++
    this.stack.increment()
  }

  private parse(chunk: Chunk) {
    const from = chunk.from
    const to = chunk.to

    if (chunk.tryForTree(this.language.nodeSet!)) {
      const tree = chunk.tree!
      this.emit(this.reused.length, from, to, -1)
      this.reused.push(tree)
      return
    }

    // add open nodes to stack
    // this doesn't affect the buffer at all, but now we can watch for
    // when another node closes one of the open nodes we added
    if (chunk.open) {
      for (let i = 0; i < chunk.open.length; i++) {
        this.stack.push(chunk.open[i], from, 0)
      }
    }

    if (chunk.size) {
      for (let i = 0; i < chunk.size * 3; i += 3) {
        this.emit(
          chunk.tokens[i],
          from + chunk.tokens[i + 1],
          from + chunk.tokens[i + 2],
          4
        )
      }
    }

    // pop close nodes from the stack, if they can be paired with an open node
    if (chunk.close) {
      for (let i = 0; i < chunk.close.length; i++) {
        const id = chunk.close[i]
        const idx = this.stack.last(id)

        if (idx !== null) {
          // cut off anything past the closing element
          // i.e. inside nodes won't persist outside their parent if they
          // never closed before their parent did
          this.stack.close(idx)

          // finally pop the node
          const s = this.stack.pop()!
          const node = s[0]
          const pos = s[1]
          const children = s[2]

          this.emit(node, pos, to, children * 4 + 4)
        }
      }
    }
  }

  step(force = false) {
    if (this.index < this.buffer.chunks.length - +force) {
      const chunk = this.buffer.chunks[this.index]
      this.parse(chunk)
      this.index++
      return true
    }
    return false
  }

  advanceFully(force = false) {
    if (!this.done) while (this.step(force)) {}
  }

  compile(start: number, length: number) {
    if (!this.buffer.chunks.length) {
      return new Tree(this.language.topNode!, [], [], length)
    }

    this.advanceFully()

    if (FINISH_INCOMPLETE_NODES) {
      while (this.stack.length > 0) {
        // emit an error token
        this.emit(NodeID.ERROR_INCOMPLETE, length, length, 4)

        // finish the last element in the stack
        const s = this.stack.pop()!
        const node = s[0]
        const pos = s[1]
        const children = s[2]

        this.emit(node, pos, length, children * 4 + 4)
      }
    }

    const topID = NodeID.TOP
    const reused = this.reused
    const buffer = new ArrayBufferCursor(this.compiled, this.size * 4)
    const nodeSet = this.language.nodeSet!

    // build tree from buffer
    const tree = Tree.build({ topID, buffer, reused, nodeSet, start, length })

    // bit of a hack (private properties)
    // this is so that we don't need to build another tree
    const props = Object.create(null)
    // @ts-ignore
    props[this.language.stateProp!.id] = this.buffer
    // @ts-ignore
    tree.props = props

    return tree
  }
}

// prettier-ignore
/** Cursor that the `Tree.buildData` function uses to read a buffer. */
export class ArrayBufferCursor implements BufferCursor {
  constructor(readonly buffer: Int32Array, public pos = buffer.length) {}

  // weirdly enough, using getters here is _faster_.
  // I don't understand why, lol

  get id()    { return this.buffer[this.pos - 4] }
  get start() { return this.buffer[this.pos - 3] }
  get end()   { return this.buffer[this.pos - 2] }
  get size()  { return this.buffer[this.pos - 1] }

  next() { this.pos -= 4 }
  fork() { return new ArrayBufferCursor(this.buffer, this.pos) }
}
