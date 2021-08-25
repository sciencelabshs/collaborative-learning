/* eslint-env node */
// default configuration tuned for development
module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
    },
    plugins: ["@typescript-eslint", "json", "react", "react-hooks"],
    env: {
      browser: true,
      es6: true,
      jest: true
    },
    settings: {
      react: {
        pragma: "React",
        version: "detect"
      }
    },
    ignorePatterns: [
      "build/", "node_modules/"
    ],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:eslint-comments/recommended",
      "plugin:json/recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended"
    ],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-confusing-non-null-assertion": "error",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",  // 27 as of 2020-09-13
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-shadow": ["error", { builtinGlobals: false, hoist: "all", allow: [] }],
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true }],
      "@typescript-eslint/prefer-optional-chain": "off",  // 300 as of 2020-09-13
      curly: ["error", "multi-line", "consistent"],
      "dot-notation": "error",
      "eol-last": "warn",
      eqeqeq: ["error", "smart"],
      "eslint-comments/no-unused-disable": "off",   // enabled in .eslintrc.build.js
      "max-len": ["warn", { code: 120, ignoreUrls: true }],
      "no-bitwise": "error",
      "no-debugger": "off", // enabled in .eslintrc.build.js
      "no-duplicate-imports": "error",
      "no-sequences": "error",
      "no-shadow": "off", // superseded by @typescript-eslint/no-shadow
      "no-tabs": "error",
      "no-unneeded-ternary": "error",
      "no-unused-expressions": ["error", { allowShortCircuit: true }],
      "no-unused-vars": "off",  // superseded by @typescript-eslint/no-unused-vars
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-rename": "error",
      "no-useless-return": "error",
      "no-var": "error",
      "no-whitespace-before-property": "error",
      "object-shorthand": "error",
      "prefer-const": "error",
      "prefer-object-spread": "error",
      "prefer-regex-literals": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      radix: "error",
      "react/jsx-closing-tag-location": "error",
      "react/jsx-handler-names": "off", // 13 as of 2020-09-13
      "react/jsx-no-useless-fragment": "error",
      "react/no-access-state-in-setstate": "error",
      "react/no-danger": "error",
      "react/no-unsafe": ["off", { checkAliases: true }], // 1 as of 2020-09-13
      "react/no-unused-state": "error",
      "react/prop-types": "off",
      semi: ["error", "always"]
    },
    overrides: [
      { // some rules can be relaxed in tests
        files: ["**/*.test.*"],
        rules: {
          "@typescript-eslint/no-non-null-assertion": "off",
          // var is useful in mocking due to its hoisting semantics
          "no-var": "off"
        }
      },
      {
        files: ["**/webpack.config.js"],
        rules: {
          "@typescript-eslint/no-require-imports": "off",
          "@typescript-eslint/no-var-requires": "off"
        }
      }
    ]
};
