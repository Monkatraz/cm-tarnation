/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CompletionContext } from "@codemirror/autocomplete"
import type { SyntaxNode, Tree } from "@lezer/common"
import { nodeTypeProp } from "../constants"
import type { Node } from "../grammar/node"

/**
 * An extended form of CodeMirror's `CompletionContext` provided to
 * Tarnation autocomplete handlers.
 */
export class TarnationCompletionContext extends CompletionContext {
  /** The {@link Node} type used by the node at the current position. */
  declare type: Node

  /** The syntax tree of the editor. */
  declare tree: Tree

  /** The node at the current position. */
  declare node: SyntaxNode

  /** Will be true if the completion handler was called via the parent chain. */
  declare traversed: boolean

  private declare _around?: SyntaxNode | null
  private declare _text?: string

  /**
   * Mutates a CodeMirror `CompletionContext` into a
   * {@link TarnationCompletionContext}.
   *
   * @param context - The `CompletionContext` to mutate.
   * @param type - The {@link Node} type.
   * @param tree - The syntax tree of the editor.
   * @param node - The node at the current position.
   * @param traversed - Set to `true` if the completion handler should be
   *   called via the parent chain.
   */
  static mutate(
    context: CompletionContext,
    type: Node,
    tree: Tree,
    node: SyntaxNode,
    traversed: boolean
  ) {
    if (Object.getPrototypeOf(context) === this.prototype) {
      return context as TarnationCompletionContext
    }

    const mutated = Object.setPrototypeOf(context, this.prototype)

    mutated.type = type
    mutated.tree = tree
    mutated.node = node
    mutated.traversed = traversed

    return mutated as TarnationCompletionContext
  }

  /** The `SyntaxNode` surrounding the current position. */
  get around() {
    if (this._around !== undefined) return this._around
    const node = this.tree.resolve(this.pos)
    if (!node) return null
    this._around = node
    return node as SyntaxNode
  }

  /** The {@link Node} type of the {@link around} node. */
  get aroundType() {
    return this.grammarType(this.around)
  }

  /** The starting position of the current node. */
  get from() {
    return this.node.from
  }

  /** The ending positon of the current node. */
  get to() {
    return this.node.to
  }

  /** The string of text covered by the current node. */
  get text() {
    if (this._text !== undefined) return this._text
    const result = this.state.sliceDoc(this.node.from, this.node.to)
    this._text = result
    return result
  }

  /**
   * Gets the {@link Node} type of a `SyntaxNode`.
   *
   * @param node - The `SyntaxNode` to get the type from.
   */
  grammarType(node: SyntaxNode | null | undefined) {
    const type = node?.type.prop(nodeTypeProp)
    return type ?? null
  }

  /**
   * Gets the string of text covered by a `SyntaxNode`.
   *
   * @param node - The `SyntaxNode` to get the text from.
   */
  textOf(node: SyntaxNode | null | undefined) {
    if (!node) return null
    return this.state.sliceDoc(node.from, node.to)
  }

  /**
   * Gets the parents of a `SyntaxNode`.
   *
   * @param node - The `SyntaxNode` to get the parents from.
   * @param max - The maximum number of parents to traverse upwards for.
   */
  parentsOf(node: SyntaxNode | null | undefined, max?: number) {
    if (!node) return []
    const parents: SyntaxNode[] = []
    let dist = 0
    for (let cur = node.parent; cur; cur = cur.parent) {
      dist++
      parents.push(cur)
      if (max && max > 0 && dist >= max) break
    }
    return parents
  }

  /**
   * Finds the first parent of a `SyntaxNode` that matches the given name(s).
   *
   * @param node - The `SyntaxNode` to find a parent for.
   * @param parent - The name(s) of the parent to find.
   * @param max - The maximum number of parents to traverse upwards for.
   */
  findParentOf(
    node: SyntaxNode | null | undefined,
    parent: string | string[],
    max?: number
  ) {
    if (!node) return null
    if (typeof parent === "string") parent = [parent]
    let dist = 0
    for (let cur = node.parent; cur; cur = cur.parent) {
      dist++
      if (parent.includes(cur.name)) return cur
      if (max && max > 0 && dist >= max) break
    }
    return null
  }

  /**
   * Shorthand for using {@link findParentsOf} on the current node.
   *
   * @param parent - The name(s) of the parent to find.
   * @param max - The maximum number of parents to traverse upwards for.
   */
  parent(parent: string | string[], max?: number) {
    return this.findParentOf(this.node, parent, max)
  }

  /**
   * Shorthand for running {@link parentsOf} on the current node.
   *
   * @param level - The maximum number of parents to get.
   */
  parents(level = 1) {
    if (level <= 0) return null
    const parents = this.parentsOf(this.node, level)
    return parents[parents.length - 1] ?? null
  }

  /**
   * Checks if the current position is inbetween the two given nodes.
   *
   * @param left - The left node to check for.
   * @param right - The right node to check for. Defaults to the same as
   *   the `left` node.
   */
  isInbetween(left: string, right = left) {
    const leftNode = this.tree.resolve(this.pos, 1)
    const rightNode = this.tree.resolve(this.pos, -1)
    if (!leftNode || !rightNode) return false
    if (leftNode.name !== left || rightNode.name !== right) return false
    return true
  }
}
