/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export enum Wrapping {
  /** The {@link Node} in this match contains the entirety of the branch. */
  FULL,
  /** The {@link Node} in this match begins the branch. */
  BEGIN,
  /** The {@link Node} in this match ends the branch. */
  END
}

export enum NodeID {
  NONE,
  TOP,
  ERROR,
  SAFE
}

/** Number of tokens per chunk. */
export const CHUNK_SIZE = 4

export const FINISH_INCOMPLETE_NODES = true

export const DISABLED_NESTED = false

export const REUSE_LEFT = true

export const REUSE_RIGHT = true

export const MARGIN_BEFORE = 32

export const MARGIN_AFTER = 128

// disabled as it doesn't seem to be needed for performance
export const LIMIT_TO_VIEWPORT = false
