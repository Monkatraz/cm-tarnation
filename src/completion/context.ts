/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CompletionContext } from "@codemirror/autocomplete"
import type { SyntaxNode, Tree } from "@lezer/common"
import { Node, NodeTypeProp } from "../grammar/node"

export class TarnationCompletionContext extends CompletionContext {
  declare handler: string
  declare type: Node
  declare tree: Tree
  declare node: SyntaxNode

  static mutate(context: CompletionContext, type: Node, tree: Tree, node: SyntaxNode) {
    if (Object.getPrototypeOf(context) === this) {
      return context as TarnationCompletionContext
    }

    const mutated: TarnationCompletionContext = Object.setPrototypeOf(context, this)

    mutated.handler = type.autocomplete ?? "*"
    mutated.type = type
    mutated.tree = tree
    mutated.node = node

    return mutated
  }

  get around() {
    const node = this.tree.resolve(this.pos, -1)
    if (!node) return null
    return node
  }

  get aroundType() {
    return this.grammarType(this.around)
  }

  get from() {
    return this.node.from
  }

  get to() {
    return this.node.to
  }

  get text() {
    return this.state.sliceDoc(this.node.from, this.node.to)
  }

  grammarType(node: SyntaxNode | null | undefined) {
    const type = node?.type.prop(NodeTypeProp)
    return type ?? null
  }

  textOf(node: SyntaxNode | null | undefined) {
    if (!node) return null
    return this.state.sliceDoc(node.from, node.to)
  }

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

  parent(level = 1) {
    if (level <= 0) return null
    const parents = this.parentsOf(this.node, level)
    return parents[parents.length - 1] ?? null
  }

  isInbetween(left: string, right = left) {
    const leftNode = this.tree.resolve(this.pos, 1)
    const rightNode = this.tree.resolve(this.pos, -1)
    if (!leftNode || !rightNode) return false
    if (leftNode.name !== left || rightNode.name !== right) return false
    return true
  }
}
