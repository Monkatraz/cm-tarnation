/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { CompletionContext } from "@codemirror/autocomplete"
import type { SyntaxNode, Tree } from "@lezer/common"
import type { Node } from "../grammar/node"

export class TarnationCompletionContext extends CompletionContext {
  declare handler: string
  declare tree: Tree
  declare node: SyntaxNode
  declare map: Map<number, Node>

  type(node: SyntaxNode | null | undefined) {
    if (!node || !this.map.has(node.type.id)) return null
    return this.map.get(node.type.id)!
  }

  text(node: SyntaxNode | null | undefined) {
    if (!node) return null
    return this.state.sliceDoc(node.from, node.to)
  }

  parents(node: SyntaxNode | null | undefined, max?: number) {
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

  findParent(
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

  isInbetween(left: string, right = left) {
    const leftNode = this.tree.resolve(this.pos, 1)
    const rightNode = this.tree.resolve(this.pos, -1)
    if (!leftNode || !rightNode) return false
    if (leftNode.name !== left || rightNode.name !== right) return false
    return true
  }
}

export function mutate(
  context: CompletionContext,
  handler: string,
  tree: Tree,
  node: SyntaxNode
) {
  const mutated: TarnationCompletionContext = Object.setPrototypeOf(
    context,
    TarnationCompletionContext.prototype
  )

  mutated.handler = handler
  mutated.tree = tree
  mutated.node = node

  return mutated
}
