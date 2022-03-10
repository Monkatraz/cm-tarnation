/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CompletionContext } from "@codemirror/autocomplete"
import { ensureSyntaxTree } from "@codemirror/language"
import type { SyntaxNode } from "@lezer/common"
import type { Node } from "../grammar/node"
import type { TarnationLanguage } from "../language"
import type { AutocompleteHandler } from "../types"
import { mutate } from "./context"

export class Autocompleter {
  typeMap = new Map<number, Node>()
  handlers = new Map<string, AutocompleteHandler>()

  constructor(public language: TarnationLanguage) {
    for (const type of this.language.grammar!.repository.nodes()) {
      this.typeMap.set(type.id, type)
      if (
        this.language.configure.autocomplete &&
        type.autocomplete &&
        type.autocomplete in this.language.configure.autocomplete
      ) {
        this.handlers.set(
          type.autocomplete,
          this.language.configure.autocomplete[type.autocomplete]
        )
      }
    }
  }

  handle(context: CompletionContext) {
    if (!this.handlers.keys.length) return null

    const { state, pos } = context
    const tree = ensureSyntaxTree(state, pos)
    if (!tree) return null

    const node: SyntaxNode = tree.resolve(pos)
    if (!node || !this.typeMap.has(node.type.id)) return null

    const type = this.typeMap.get(node.type.id)!
    if (!type.autocomplete || !this.handlers.has(type.autocomplete)) return null

    const mutated = mutate(context, type.autocomplete, tree, node)

    return this.handlers.get(type.autocomplete)!.call(this.language, mutated)
  }
}
