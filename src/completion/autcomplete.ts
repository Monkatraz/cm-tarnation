/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CompletionContext } from "@codemirror/autocomplete"
import { ensureSyntaxTree } from "@codemirror/language"
import type { SyntaxNode } from "@lezer/common"
import { Node, NodeTypeProp } from "../grammar/node"
import type { TarnationLanguage } from "../language"
import type { AutocompleteHandler } from "../types"
import { TarnationCompletionContext } from "./context"

export class Autocompleter {
  handlers = new Map<string, AutocompleteHandler>()

  constructor(public language: TarnationLanguage) {
    if (this.language.configure.autocomplete) {
      for (const key in this.config) {
        const handler = this.config[key]
        if (key === "*" || typeof handler !== "function") continue
        for (const name of key.trim().split(/\s+/)) this.handlers.set(name, handler)
      }

      for (const node of this.language.grammar!.repository!.nodes()) {
        if (node.autocomplete && !this.handlers.has(node.autocomplete)) {
          console.warn(`No autocomplete handler for ${node.autocomplete}`)
        }
      }
    }
  }

  get config() {
    return this.language.configure.autocomplete!
  }

  private get(handler: string | null | undefined) {
    if (!handler) return null
    if (!this.handlers.has(handler)) return null
    return this.handlers.get(handler)!
  }

  private getHandlerFor(type: Node | null | undefined) {
    if (!type) return null

    let handler: AutocompleteHandler | null = null

    if (type.autocomplete) handler = this.get(type.autocomplete)
    if (!handler && this.config._alsoTypeNames) handler = this.get(type.name)
    if (!handler && this.config._alsoEmitNames) handler = this.get(type.type.name)

    return handler
  }

  private traverse(
    node: SyntaxNode | null | undefined,
    root = true
  ): { type: Node | null; handler: AutocompleteHandler | null } {
    if (!node) return { type: null, handler: null }

    let type = node?.type.prop(NodeTypeProp) ?? null
    let handler = this.getHandlerFor(type)

    if (this.config._traverseUpwards && !type && !handler && node.parent) {
      ;({ type, handler } = this.traverse(node.parent, false))
    }

    if (!handler && root && this.config["*"]) {
      type = node?.type.prop(NodeTypeProp) ?? null
      handler = this.config["*"]
    }

    return { type, handler }
  }

  handle(context: CompletionContext) {
    if (!this.handlers.size) return null

    const tree = ensureSyntaxTree(context.state, context.pos)
    if (!tree) return null

    const node: SyntaxNode = tree.resolve(context.pos, -1)
    const { type, handler } = this.traverse(node)

    if (!node || !type || !handler) return null

    const mutated = TarnationCompletionContext.mutate(context, type, tree, node)

    return handler.call(this.language, mutated)
  }
}
