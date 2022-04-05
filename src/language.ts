/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
  defineLanguageFacet,
  Language,
  languageDataProp,
  LanguageDescription,
  LanguageSupport
} from "@codemirror/language"
import type { Extension, Facet } from "@codemirror/state"
import { NodeProp, NodeSet, NodeType } from "@lezer/common"
import type { ChunkBuffer } from "./chunk/buffer"
import { Autocompleter } from "./completion/autcomplete"
import { NodeID } from "./constants"
import type * as DF from "./grammar/definition"
import { Grammar } from "./grammar/grammar"
import { ParserFactory } from "./parser"
import type { ParserConfiguration, TarnationLanguageDefinition } from "./types"
import { removeUndefined } from "./util"

/**
 * Tarnation language. Use the `load` method to get the extension needed to
 * load the language into CodeMirror. If you need a `LanguageDescription`,
 * the `description` property will hold one.
 */
export class TarnationLanguage {
  /** CodeMirror language data. */
  declare languageData: Record<string, any>

  /** The grammar definition (or a function that returns one). */
  declare grammarData: DF.Grammar | (() => DF.Grammar)

  /** Extra configuration for the parser. */
  declare configure: ParserConfiguration

  /** List of extensions to load with the language. */
  declare extensions: Extension[]

  /** `LanguageDescription` instance for the language. */
  declare description: LanguageDescription

  /**
   * Languages that are supported for nesting. Can also be a facet that
   * provides the list.
   */
  declare nestLanguages: LanguageDescription[] | Facet<LanguageDescription>

  // only shows up after loading

  /** Fully resolved grammar instance. Requires the language to have been loaded. */
  declare grammar?: Grammar

  /**
   * The CodeMirror top node for the language. Requires the language to
   * have been loaded.
   */
  declare topNode?: NodeType

  /** The special `NodeType` representing "errors" in the parsing. */
  declare errorNode?: NodeType

  /**
   * All of the node types used by the language. Requires the language to
   * have been loaded.
   */
  declare nodeTypes?: NodeType[]

  /**
   * CodeMirror `NodeSet` for the language. Requires the language to have
   * been loaded.
   */
  declare nodeSet?: NodeSet

  /**
   * The `NodeProp` that points to the `ChunkBuffer` data. Will be assigned
   * to the top node of the language. Requires the language to have been loaded.
   */
  declare stateProp?: NodeProp<ChunkBuffer>

  /**
   * Autocompleter instance. Requires the language to have been loaded, but
   * will only be there if there are any autocompletion handlers.
   */
  declare autocompleter?: Autocompleter

  /**
   * `LanguageSupport` instance for the language. Requires the language to
   * have been loaded.
   */
  declare support?: LanguageSupport

  /**
   * CodeMirror `language` instance for the language. Requires the language
   * to have been loaded.
   */
  declare language?: Language

  /** Will be true if the langauge has been loaded once. */
  loaded = false

  /** Will be set to the number of milliseconds the last parse time took. */
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

    const facet = defineLanguageFacet(this.languageData)
    this.topNode = NodeType.define({
      id: NodeID.TOP,
      name: this.description.name,
      top: true,
      props: [[languageDataProp, facet]]
    })

    this.errorNode = NodeType.define({ name: "⚠️", id: NodeID.ERROR, error: true })

    const nodeTypes = this.grammar.repository.nodes().map(n => n.type)

    // unshift our special nodes into the list
    // (NodeType.none always has an ID of 0)
    nodeTypes.unshift(NodeType.none, this.topNode, this.errorNode)

    let nodeSet = new NodeSet(nodeTypes)

    if (this.configure.props) nodeSet = nodeSet.extend(...this.configure.props)

    this.nodeTypes = nodeTypes
    this.nodeSet = nodeSet

    if (this.configure.autocomplete) {
      this.autocompleter = new Autocompleter(this)
      this.languageData.autocomplete = this.autocompleter.handle.bind(this.autocompleter)
    }

    // setup language support
    this.language = new Language(facet, new ParserFactory(this), this.topNode)
    this.support = new LanguageSupport(this.language, this.extensions)
    this.loaded = true

    console.log(this)

    return this.support
  }
}
