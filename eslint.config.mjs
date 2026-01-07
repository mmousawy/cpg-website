import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // Always require semicolons
      "semi": ["error", "always"],

      // Always require trailing commas in multiline
      "comma-dangle": ["error", "always-multiline"],

      // Use 2 spaces for indentation
      "indent": ["error", 2, { "SwitchCase": 1 }],

      // No trailing whitespace
      "no-trailing-spaces": "error",

      // Maximum 1 consecutive empty line
      "no-multiple-empty-lines": ["error", { "max": 1, "maxEOF": 0, "maxBOF": 0 }],

      // Ensure newline at end of file
      "eol-last": ["error", "always"],
    },
  },
];

export default eslintConfig;
