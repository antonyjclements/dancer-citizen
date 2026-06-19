import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "apps/**/dist/**",
    "infra/cdk.out/**",
    "next-env.d.ts",
  ]),
  {
    files: ["apps/cms-api/**/*.ts", "apps/react-site/**/*.ts", "apps/react-site/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
