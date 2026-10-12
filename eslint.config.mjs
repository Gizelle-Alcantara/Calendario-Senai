import globals from "globals";
export default [
  { ignores: ["public/**", "src/js/vendor/**", "node_modules/**"] },
  { files: ["src/js/**/*.js"], languageOptions: { sourceType: "module", ecmaVersion: "latest", globals: { ...globals.browser, PLAN: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] } },
];
