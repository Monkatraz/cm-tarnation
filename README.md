# cm-tarnation

An alternative parser for CodeMirror 6. Its grammar focuses on being extremely flexible while not suffering the consequence of being utterly impossible to understand. It's inspired a bit by the Monarch and Textmate grammar formats, but pretty much entirely avoids the pitfalls of their systems.

Tarnation is _not_ line-based. It is capable of reusing both previous _and ahead_ data when parsing, making it fully incremental. It can restart from nearly any point in a document, and usually only barely parses the immediate region around an edit. It also doesn't use very much memory, due to some clever usage of `ArrayBuffer` based tokens.

Tarnation was created as part of my work on [Wikijump](https://github.com/scpwiki/wikijump/).

### Why?

Tarnation can do things that Lezer (the parser you'd usually use for CodeMirror) can't. For example, Tarnation can parse something like Markdown, and other weird esoteric markup/formatting languages.

However, if you're not trying to make a grammar for some bonkers language, it's probably possible to make a grammar using Lezer. You should almost certainly do this - its grammar format is probably superior to Tarnation's, and it will be faster and better behaved in general.

## Installation

```
npm install cm-tarnation
```

## Usage

Tarnation's grammar is basically a JSON matching a certain schema. It's designed more around YAML, though.

TODO

## Contributing

Tarnation is welcome to PRs, issues, etc. If you want to understand how Tarnation works, I made sure to spend a lot of time nicely documenting the source files. It's not all that complicated really. It would help you a lot if you read up on how CodeMirror itself works, though.

### Building

Tarnation is built using TypeScript, with no special build tools. You can use the following command:

```
npm run build
```

## License

MPL 2.0. See the [license file](LICENSE) for more details.
