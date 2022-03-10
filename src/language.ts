/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Language, LanguageDescription, LanguageSupport } from "@codemirror/language"
import type { Extension, Facet } from "@codemirror/state"
import { NodeProp, NodeSet, NodeType } from "@lezer/common"
import type { ChunkBuffer } from "./chunk/buffer"
import { Autocompleter } from "./completion/autcomplete"
import type * as DF from "./grammar/definition"
import { Grammar } from "./grammar/grammar"
import { ParserFactory } from "./parser"
import type { ParserConfiguration, TarnationLanguageDefinition } from "./types"
import { makeTopNode, removeUndefined } from "./util"

export class TarnationLanguage {
  declare languageData: Record<string, any>
  declare grammarData: DF.Grammar | (() => DF.Grammar)
  declare configure: ParserConfiguration
  declare extensions: Extension[]
  declare description: LanguageDescription
  declare nestLanguages: LanguageDescription[] | Facet<LanguageDescription>

  // only shows up after loading

  declare grammar?: Grammar
  declare top?: NodeType
  declare nodeTypes?: NodeType[]
  declare nodeSet?: NodeSet
  declare stateProp?: NodeProp<ChunkBuffer>
  declare autcompleter?: Autocompleter
  declare support?: LanguageSupport
  declare language?: Language

  loaded = false
  performance = 0

  constructor({
    name,
    grammar,
    nestLanguages = [],
    configure = {},
    alias,
    extensions,
    languageData = {},
    supportExtensions = []
  }: TarnationLanguageDefinition) {
    const dataDescription = removeUndefined({ name, alias, extensions })

    this.languageData = { ...dataDescription, ...languageData }
    this.nestLanguages = nestLanguages
    this.grammarData = grammar
    this.configure = configure
    this.extensions = supportExtensions

    this.description = LanguageDescription.of({
      ...dataDescription,
      load: async () => this.load()
    })
  }

  /**
   * Loads and processes the language. Calling this function repeatedly
   * will just return the previously loaded language.
   */
  load() {
    // setup grammar data
    if (this.description?.support) return this.description.support
    const def =
      typeof this.grammarData === "function" ? this.grammarData() : this.grammarData
    this.grammar = new Grammar(def, this.configure.variables)

    // merge data from the grammar
    Object.assign(this.languageData, this.grammar.data)

    // setup node data

    this.stateProp = new NodeProp<ChunkBuffer>({ perNode: true })

    const { facet, top } = makeTopNode(this.description.name, this.languageData)
    this.top = top

    const nodeTypes = this.grammar.repository.nodes().map(n => n.type)
    nodeTypes.unshift(NodeType.none, top)

    let nodeSet = new NodeSet(nodeTypes)

    if (this.configure.props) nodeSet = nodeSet.extend(...this.configure.props)

    this.nodeTypes = nodeTypes
    this.nodeSet = nodeSet

    if (this.configure.autocomplete) {
      this.autcompleter = new Autocompleter(this)
      this.languageData.autocomplete = this.autcompleter.handle.bind(this.autcompleter)
    }

    // setup language support
    this.language = new Language(facet, new ParserFactory(this), top)
    this.support = new LanguageSupport(this.language, this.extensions)
    this.loaded = true

    return this.support
  }
}
