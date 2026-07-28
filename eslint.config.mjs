import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/immutability": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      "prefer-const": "off",
      "@next/next/no-html-link-for-pages": "warn",
      "react-compiler/react-compiler": "off",
      "@react-compiler/react-compiler": "off",
      "react-hooks/preserve-manual-memoization": "off",
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    "sync-external.js",
    "cajero-print-app/**",
    "check-db.cjs",
  ]),
]);

export default eslintConfig;
