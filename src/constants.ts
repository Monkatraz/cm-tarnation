/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { NodeType } from "@lezer/common"

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
  ERROR_ADVANCE,
  ERROR_INCOMPLETE,
  SAFE
}

export const CHUNK_ARRAY_INTERVAL = 16

export const COMPILER_STACK_SIZE = 64

export const COMPILER_ARRAY_INTERVAL = 32768

export const FINISH_INCOMPLETE_NODES = true

export const DISABLED_NESTED = true

export const REUSE_LEFT = true

export const REUSE_RIGHT = true

export const MARGIN_BEFORE = 32

export const MARGIN_AFTER = 128

// disabled as it doesn't seem to be needed for performance
export const LIMIT_TO_VIEWPORT = false

// node types

export const NODE_ERROR_ADVANCE = NodeType.define({
  name: "⚠️ ERROR_ADVANCE",
  id: NodeID.ERROR_ADVANCE,
  error: true
})

export const NODE_ERROR_INCOMPLETE = NodeType.define({
  name: "⚠️ ERROR_INCOMPLETE",
  id: NodeID.ERROR_INCOMPLETE,
  error: true
})
