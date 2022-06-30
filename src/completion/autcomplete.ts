/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import type { CompletionContext } from "@codemirror/autocomplete"
import { ensureSyntaxTree } from "@codemirror/language"
import type { SyntaxNode } from "@lezer/common"
import { nodeTypeProp } from "../constants"
import type { Node } from "../grammar/node"
import type { TarnationLanguage } from "../language"
import type { AutocompleteHandler } from "../types"
import { TarnationCompletionContext } from "./context"

/** Handles autocompletion for a {@link TarnationLanguage}. */
export class Autocompleter {
  /** A map of node names to completion handlers. */
  handlers = new Map<string, AutocompleteHandler>()

  /** @param language - The {@link TarnationLanguage} to provide completions for. */
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

  /** Configuration for the autocomplete. */
  get config() {
    return this.language.configure.autocomplete!
  }

  /**
   * Gets a handler via a name,
   *
   * @param handler - The name of the handler.
   */
  private get(handler: string | null | undefined) {
    if (!handler) return null
    if (!this.handlers.has(handler)) return null
    return this.handlers.get(handler)!
  }

  /**
   * Gets an autocomplete handler for a {@link Node}.
   *
   * @param type - The {@link Node} to get a handler for.
   */
  private getHandlerFor(type: Node | null | undefined) {
    if (!type) return null

    let handler: AutocompleteHandler | null = null

    if (type.autocomplete) handler = this.get(type.autocomplete)
    if (!handler && this.config._alsoTypeNames) handler = this.get(type.name)
    if (!handler && this.config._alsoEmitNames) handler = this.get(type.type.name)

    return handler
  }

  /**
   * Tries to get an autocomplete handler for a `SyntaxNode`. Will traverse
   * up the node's parents if allowed to do so in the configuration.
   *
   * @param node - The `SyntaxNode` to get a handler for.
   * @param root - Internal parameter. Defaults to true.
   */
  private traverse(
    node: SyntaxNode | null | undefined,
    root = true
  ): {
    node: SyntaxNode | null
    type: Node | null
    handler: AutocompleteHandler | null
    traversed: boolean
  } {
    if (!node) return { node: null, type: null, handler: null, traversed: false }

    const type = node?.type.prop(nodeTypeProp) ?? null
    const handler = this.getHandlerFor(type)

    if (!type || !handler) {
      if (this.config._traverseUpwards && node.parent) {
        const { node: child, type, handler } = this.traverse(node.parent, false)
        if (child && type && handler) {
          return { node: child, type, handler, traversed: true }
        }
      }

      if (root && this.config["*"]) {
        return { node, type, handler: this.config["*"], traversed: false }
      }
    }

    return { node, type, handler, traversed: false }
  }

  /**
   * CodeMirror autocompletion handler function. Delegates to autocomplete
   * handlers defined in the language's configuartion.
   *
   * @param context - The `CompletionContext` provided by CodeMirror.
   */
  handle(context: CompletionContext) {
    if (!this.handlers.size) return null

    const tree = ensureSyntaxTree(context.state, context.pos)
    if (!tree) return null

    const current = tree.resolve(context.pos, -1)
    const { node, type, handler, traversed } = this.traverse(current)

    if (!node || !type || !handler) return null

    const mutated = TarnationCompletionContext.mutate(
      context,
      type,
      tree,
      node,
      traversed
    )

    return handler.call(this.language, mutated)
  }
}
