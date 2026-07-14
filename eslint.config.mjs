import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The visual-editor primitives deliberately drive contentEditable and the
    // selection imperatively (see docs/VISUAL-EDITOR.md): they own their DOM
    // text via a ref and sync external systems (localStorage, the live
    // selection) to state on mount. The React-compiler lint rules assume pure
    // render and flag these intentional patterns, so they're relaxed here — and
    // ONLY here — while the rest of the app keeps full strictness.
    files: ["src/components/editable/**/*.tsx"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
