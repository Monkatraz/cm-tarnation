/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { GrammarToken, ParserAction } from "./types"

// TODO: hold onto data views directly rather than storing the buffers

/**
 * An `ArrayBuffer` stored token. This is effectively a highly efficient
 * representation of a {@link GrammarToken}.
 *
 * Uses an ArrayBuffer that is, in order:
 *
 * - The token ID, which is a uint8
 * - The token from position, which is a uint32
 * - The token length, which is a uint16
 * - A repeating list of parser actions
 *
 * Parser actions are:
 *
 * - Action type, which is a uint8 (0 is OPEN, 1 is CLOSE)
 * - Node id, which is a uint8
 */
export class Token {
  declare readonly buffer: ArrayBuffer
  private declare readonly view: DataView

  constructor(
    id: number | null,
    from: number,
    to: number,
    open?: ParserAction,
    close?: ParserAction
  ) {
    let len = 7
    if (open) len += open.length * 2
    if (close) len += close.length * 2

    const buffer = new ArrayBuffer(len)
    const view = new DataView(buffer)
    view.setUint8(0, id ?? 0)
    view.setUint32(1, from)
    view.setUint16(5, to - from)

    let offset = 7
    if (open) {
      for (let i = 0; i < open.length; i++) {
        view.setUint8(offset, 0)
        view.setUint8(offset + 1, open[i])
        offset += 2
      }
    }
    if (close) {
      for (let i = 0; i < close.length; i++) {
        view.setUint8(offset, 1)
        view.setUint8(offset + 1, close[i])
        offset += 2
      }
    }

    this.buffer = buffer
    this.view = view
  }

  /** Returns true if the token has any parser actions. */
  hasActions() {
    return this.buffer.byteLength > 7
  }

  /** Reads the actions from the token. */
  actions() {
    if (this.buffer.byteLength <= 7) return { open: undefined, close: undefined }

    const length = this.buffer.byteLength - 7
    const open: ParserAction = []
    const close: ParserAction = []

    let i = 0
    while (i < length) {
      const type = this.view.getUint8(7 + i)
      const id = this.view.getUint8(8 + i)
      if (type === 0) open.push(id)
      if (type === 1) close.push(id)
      i += 2
    }

    return {
      open: open.length ? open : undefined,
      close: close.length ? close : undefined
    }
  }

  /**
   * Reads out the token.
   *
   * @param offset - The offset to add to the token's position.
   */
  read(offset = 0): GrammarToken {
    const { open, close } = this.actions()
    const id = this.view.getUint8(0) || null
    const from = this.view.getUint32(1) + offset
    const to = from + this.view.getUint16(5)
    return [id, from, to, open, close]
  }
}
