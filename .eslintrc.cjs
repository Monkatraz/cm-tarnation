/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function useDefault(type, rules) {
  return Object.assign({}, ...rules.map(rule => ({ [rule]: type })))
}

function prefixKeys(prefix, obj) {
  const mappedObj = {}
  for (const key in obj) {
    mappedObj[prefix + key] = obj[key]
  }
  return mappedObj
}

const MPL = ` This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. `

const rules = {
  code: {
    ...useDefault("error", [
      "eqeqeq",
      "yoda",
      "prefer-rest-params",
      "prefer-spread",
      "symbol-description",
      "template-curly-spacing",
      "prefer-numeric-literals",
      "prefer-template",
      "no-useless-rename",
      "no-useless-computed-key",
      "no-useless-concat",
      "no-undef-init",
      "no-throw-literal",
      "default-case-last",
      "wrap-iife"
    ]),
    "prefer-arrow-callback": ["error", { allowNamedFunctions: true }]
  },

  restrict: {
    ...useDefault("error", [
      "no-alert",
      "no-caller",
      "no-eval",
      "no-implied-eval",
      "no-var",
      "no-script-url"
    ])
  },

  style: {
    ...useDefault("warn", [
      "new-parens",
      "no-lonely-if",
      "no-unneeded-ternary",
      "operator-assignment",
      "prefer-exponentiation-operator"
    ]),
    "curly": ["warn", "multi-line"],
    "@typescript-eslint/space-infix-ops": ["warn", { int32Hint: true }],
    "header/header": ["error", "block", MPL, 2]
  },

  typescript: {
    "tsdoc/syntax": "error",

    ...prefixKeys("@typescript-eslint/", {
      // code
      ...useDefault("error", [
        "ban-types",
        "no-misused-new",
        "no-non-null-asserted-optional-chain",
        "no-require-imports",
        "no-this-alias",
        "no-extra-non-null-assertion",
        "no-unnecessary-type-constraint",
        "no-for-in-array",
        "prefer-as-const",
        "prefer-namespace-keyword",
        "prefer-optional-chain",
        "prefer-regexp-exec",
        "no-useless-constructor",
        "unbound-method"
      ]),
      "triple-slash-reference": ["error", { types: "prefer-import" }],
      // style
      ...useDefault("warn", [
        "adjacent-overload-signatures",
        "array-type",
        "no-inferrable-types",
        "consistent-indexed-object-style",
        "no-confusing-non-null-assertion"
      ]),
      "class-literal-property-style": ["warn", "fields"]
    })
  },

  typechecked: {
    ...prefixKeys("@typescript-eslint/", {
      // code
      ...useDefault("error", [
        "no-misused-promises",
        "no-floating-promises",
        "require-await",
        "no-unnecessary-boolean-literal-compare",
        "no-unnecessary-condition",
        "no-unnecessary-type-assertion",
        "no-confusing-void-expression",
        "no-unnecessary-qualifier",
        "no-unnecessary-type-arguments",
        "non-nullable-type-assertion-style",
        "prefer-includes",
        "prefer-nullish-coalescing"
      ]),
      // style
      ...useDefault("warn", ["dot-notation"])
    })
  },

  regex: {
    ...prefixKeys("regexp/", {
      ...useDefault("warn", [
        "no-empty-alternative",
        "no-empty-lookarounds-assertion",
        "no-escape-backspace",
        "no-useless-backreference",
        "no-useless-dollar-replacements",
        "control-character-escape",
        "no-dupe-characters-character-class",
        "no-trivially-nested-assertion",
        "no-trivially-nested-quantifier",
        "no-useless-character-class",
        "no-useless-lazy",
        "no-useless-non-greedy",
        "no-useless-range",
        "no-useless-two-nums-quantifier",
        "no-zero-quantifier",
        "prefer-predefined-assertion",
        "hexadecimal-escape",
        "prefer-character-class",
        "prefer-question-quantifier",
        "prefer-t",
        "sort-flags",
        "unicode-escape"
      ]),

      "match-any": ["warn", { allows: ["[^]"] }]
    })
  },

  import: {
    ...prefixKeys("import/", {
      "no-extraneous-dependencies": ["error", {}]
    })
  }
}

const baseRules = { ...rules.code, ...rules.restrict, ...rules.style, ...rules.regex }
const typeRules = { ...rules.typescript, ...rules.typeChecked }
const importRules = { ...rules.import }

module.exports = {
  root: true,
  ignorePatterns: ["**/node_modules/**", "**/lib/**"],

  extends: ["plugin:compat/recommended", "plugin:import/typescript"],

  plugins: ["@typescript-eslint", "import", "regexp", "tsdoc", "header"],

  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json"
  },

  overrides: [
    // JavaScript (Node)
    {
      files: ["*.js", "*.cjs"],
      env: { node: true, es2021: true },
      parserOptions: { createDefaultProgram: true },
      rules: baseRules
    },
    // JavaScript (Browser)
    {
      files: ["*.mjs"],
      env: { browser: true, es2021: true },
      parserOptions: { createDefaultProgram: true },
      rules: baseRules
    },
    // TypeScript (Browser)
    {
      files: ["*.d.ts", "*.ts", "*.tsx"],
      excludedFiles: "**/tests/**/*.ts",
      env: { browser: true, es2021: true },
      rules: { ...baseRules, ...typeRules, ...importRules }
    },
    // TypeScript (Testing)
    {
      files: ["**/tests/**/*.ts"],
      env: { browser: true, es2021: true },
      parserOptions: { createDefaultProgram: true },
      rules: { ...baseRules, ...typeRules }
    },
    // TypeScript (Worker)
    {
      files: ["*.worker.ts"],
      env: { worker: true, es2021: true },
      rules: { ...baseRules, ...typeRules, ...importRules }
    }
  ]
}
