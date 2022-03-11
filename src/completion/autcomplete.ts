/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CompletionContext } from "@codemirror/autocomplete"
import { ensureSyntaxTree } from "@codemirror/language"
import type { SyntaxNode } from "@lezer/common"
import { NodeTypeProp } from "../grammar/node"
import type { TarnationLanguage } from "../language"
import type { AutocompleteHandler } from "../types"
import { TarnationCompletionContext } from "./context"

export class Autocompleter {
  handlers = new Map<string, AutocompleteHandler>()

  constructor(public language: TarnationLanguage) {
    if (this.language.configure.autocomplete) {
      for (const name in this.language.configure.autocomplete) {
        const handler = this.language.configure.autocomplete[name]
        this.handlers.set(name, handler)
      }
    }
  }

  private get(handler: string | null | undefined) {
    if (!handler) return null
    if (!this.handlers.has(handler)) return null
    return this.handlers.get(handler)!
  }

  handle(context: CompletionContext) {
    if (!this.handlers.size) return null

    const { state, pos } = context
    const tree = ensureSyntaxTree(state, pos)
    if (!tree) return null

    const node: SyntaxNode = tree.resolve(pos, -1)
    const type = node?.type.prop(NodeTypeProp)
    const handler = this.get(type?.autocomplete) ?? this.get("*")

    if (!node || !type || !handler) return null

    const mutated = TarnationCompletionContext.mutate(context, type, tree, node)

    return handler.call(this.language, mutated)
  }
}
