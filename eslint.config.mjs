import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // General formatting
      "semi": ["error", "always"],
      "quotes": ["error", "single", { "avoidEscape": true }],
      "comma-dangle": ["error", "always-multiline"],
      "indent": ["error", 2, { "SwitchCase": 1 }],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],

      // JSX formatting - props on newlines
      // If element has 1+ props, first prop on new line
      "react/jsx-first-prop-new-line": ["error", "always"],
      // Max 1 prop per line always
      "react/jsx-max-props-per-line": ["error", { "maximum": 1, "when": "always" }],
      "react/jsx-closing-bracket-location": ["error", "line-aligned"],
      "react/jsx-indent-props": ["error", 2],
      // Indent JSX children
      "react/jsx-indent": ["error", 2, { "checkAttributes": true, "indentLogicalExpressions": true }],
      // Put children/content on their own line
      "react/jsx-one-expression-per-line": ["error", { "allow": "none" }],
    },
  },
];

export default eslintConfig;
