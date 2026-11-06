import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    "build/**",
    ".worktrees/**",
    ".scripts/**",
    "apps/**/dist/**",
    "apps/**/dist-staging/**",
    "infra/cdk.out/**",
  ]),
  ...tseslint.configs.recommended,
  {
    files: ["apps/cms-api/**/*.ts", "apps/react-site/**/*.ts", "apps/react-site/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
