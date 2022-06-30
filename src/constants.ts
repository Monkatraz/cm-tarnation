/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { NodeProp, NodeType } from "@lezer/common"
import type { Node } from "./grammar/node"

export enum Wrapping {
  /** The {@link Node} in this match contains the entirety of the branch. */
  FULL,
  /** The {@link Node} in this match begins the branch. */
  BEGIN,
  /** The {@link Node} in this match ends the branch. */
  END
}

export enum NodeID {
  /** ID for the `NodeType.none` node. */
  NONE,
  /** ID for the top-level node of Tarnation languages. */
  TOP,
  /**
   * ID for the `ERROR_ADVANCE` node.
   *
   * @see {@link NODE_ERROR_ADVANCE}
   */
  ERROR_ADVANCE,
  /**
   * ID for the `ERROR_INCOMPLETE` node.
   *
   * @see {@link NODE_ERROR_INCOMPLETE}
   */
  ERROR_INCOMPLETE,
  /** First ID available for the grammar. */
  SAFE
}

/**
 * Sets the initial array size for chunks, and how much to grow a chunk's
 * array if it's full.
 */
export const CHUNK_ARRAY_INTERVAL = 16

/** Sets the size of the compiler stack. */
export const COMPILER_STACK_SIZE = 64

/**
 * Sets the initial array size of the compiler's buffer, and how much to
 * grow it if it's full.
 */
export const COMPILER_ARRAY_INTERVAL = 32768

/**
 * If true, the parser will try to close off incomplete nodes at the end of
 * the syntax tree.
 */
export const FINISH_INCOMPLETE_NODES = true

/** If true, nested grammars won't be emitted. */
export const DISABLED_NESTED = false

/** If true, the "left" (previous) side of a parse will be reused. */
export const REUSE_LEFT = true

/** If true, the "right" (ahead) side of a parse will be reused. */
export const REUSE_RIGHT = true

/** Amount of characters to slice before the starting position of the parse. */
export const MARGIN_BEFORE = 32

/** Amount of characters to slice after the requested ending position of a parse. */
export const MARGIN_AFTER = 128

// disabled as it doesn't seem to be needed for performance
/** If true, the parser will try to limit what it handles to the size of the viewport. */
export const LIMIT_TO_VIEWPORT = false

// node types

/**
 * Node emitted when the parser couldn't advance through the grammar, and
 * had to manually do so.
 */
export const NODE_ERROR_ADVANCE = NodeType.define({
  name: "⚠️ ERROR_ADVANCE",
  id: NodeID.ERROR_ADVANCE,
  error: true
})

/** Node emitted at the end of incomplete nodes. */
export const NODE_ERROR_INCOMPLETE = NodeType.define({
  name: "⚠️ ERROR_INCOMPLETE",
  id: NodeID.ERROR_INCOMPLETE,
  error: true
})

/**
 * A special per-node `NodeProp` used for describing nodes where a nested
 * parser will be embedded.
 */
export const embeddedParserProp = new NodeProp<string>()

/** A `NodeProp` that points to the original grammar `Node` for the `NodeType`. */
export const nodeTypeProp = new NodeProp<Node>()
