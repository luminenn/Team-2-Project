import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts"],
  },
  // Legacy pre-merge code from the original team repo — relax strict rules
  {
    files: [
      "app/api/parse-cartridge/**",
      "app/api/video-compliance/**",
      "app/(legacy)/**",
      "components/*.tsx",
      "components/graphics/**",
      "lib/context/**",
      "lib/parser/**",
      "lib/pocr/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
