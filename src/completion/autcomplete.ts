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
      for (const key in this.language.configure.autocomplete) {
        if (key === "*" || key === "_alsoTypeNames" || key === "_alsoEmitNames") continue
        const names = key.trim().split(/\s+/)
        const handler = this.language.configure.autocomplete[key] as AutocompleteHandler
        for (const name of names) this.handlers.set(name, handler)
      }

      for (const node of this.language.grammar!.repository!.nodes()) {
        if (node.autocomplete && !this.handlers.has(node.autocomplete)) {
          console.warn(`No autocomplete handler for ${node.autocomplete}`)
        }
      }
    }
  }

  private get(handler: string | null | undefined) {
    if (!handler) return null
    if (!this.handlers.has(handler)) return null
    return this.handlers.get(handler)!
  }

  private getHandlerFor(type: Node | null | undefined) {
    if (!type) return null

    let handler: AutocompleteHandler | null = null

    if (type.autocomplete) {
      handler = this.get(type.autocomplete)
    }

    if (!handler && this.language.configure.autocomplete!._alsoTypeNames) {
      handler = this.get(type.name)
    }

    if (!handler && this.language.configure.autocomplete!._alsoEmitNames) {
      handler = this.get(type.type.name)
    }

    if (!handler && this.language.configure.autocomplete!["*"]) {
      handler = this.language.configure.autocomplete!["*"]
    }

    return handler
  }

  handle(context: CompletionContext) {
    if (!this.handlers.size) return null

    const { state, pos } = context
    const tree = ensureSyntaxTree(state, pos)
    if (!tree) return null

    const node: SyntaxNode = tree.resolve(pos, -1)
    const type = node?.type.prop(NodeTypeProp)
    const handler = this.getHandlerFor(type)

    if (!node || !type || !handler) return null

    const mutated = TarnationCompletionContext.mutate(context, type, tree, node)

    return handler.call(this.language, mutated)
  }
}
